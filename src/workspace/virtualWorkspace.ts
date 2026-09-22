// The virtual workspace: the browser's temporary, fully-editable mirror of the
// repository. GitHub stays the source of truth; nothing here is written back
// until the user explicitly commits. These are pure transforms over an
// immutable `WorkspaceData` value so they slot cleanly into a reducer.

import type { FileEntry, TreeEntry, WorkspaceChange } from '../types';
import { normalizePath } from '../utils/paths';

export interface WorkspaceData {
  /** Only files that were loaded, edited, created, or deleted live here. */
  files: Record<string, FileEntry>;
  /** Full recursive repo tree (blobs + trees) at load time, for the explorer. */
  tree: TreeEntry[];
  /** Set of blob paths present in the tree, for O(1) existence checks. */
  treeBlobs: Set<string>;
  truncated: boolean;
}

export function createWorkspace(tree: TreeEntry[], truncated: boolean): WorkspaceData {
  const treeBlobs = new Set(tree.filter((e) => e.type === 'blob').map((e) => e.path));
  return { files: {}, tree, treeBlobs, truncated };
}

export function existsInTree(ws: WorkspaceData, path: string): boolean {
  return ws.treeBlobs.has(normalizePath(path));
}

export function getEntry(ws: WorkspaceData, path: string): FileEntry | undefined {
  return ws.files[normalizePath(path)];
}

function put(ws: WorkspaceData, entry: FileEntry): WorkspaceData {
  return { ...ws, files: { ...ws.files, [entry.path]: entry } };
}

/** Record a freshly-loaded repo file (base === content on load). */
export function putBaseline(
  ws: WorkspaceData,
  path: string,
  data: { base: string | null; baseSha?: string; binary?: boolean },
): WorkspaceData {
  const p = normalizePath(path);
  const existing = ws.files[p];
  // Don't clobber unsaved edits if we already have this file.
  if (existing && existing.loaded) return ws;
  return put(ws, {
    path: p,
    base: data.base,
    content: data.base,
    baseSha: data.baseSha,
    origin: 'repo',
    loaded: true,
    binary: data.binary,
  });
}

/** Update working content of a loaded file (user edit or AI modify). */
export function setContent(ws: WorkspaceData, path: string, content: string): WorkspaceData {
  const p = normalizePath(path);
  const existing = ws.files[p];
  if (existing) {
    return put(ws, { ...existing, content, loaded: true });
  }
  // Unknown file being written → treat as new.
  return put(ws, {
    path: p,
    base: existsInTree(ws, p) ? '' : null,
    content,
    origin: existsInTree(ws, p) ? 'repo' : 'new',
    loaded: true,
  });
}

/** Create a brand-new file (origin = new). */
export function createNew(ws: WorkspaceData, path: string, content: string): WorkspaceData {
  const p = normalizePath(path);
  return put(ws, { path: p, base: null, content, origin: 'new', loaded: true });
}

/** Mark a file deleted in the workspace (content becomes null). */
export function markDeleted(ws: WorkspaceData, path: string): WorkspaceData {
  const p = normalizePath(path);
  const existing = ws.files[p];
  if (existing) {
    // Deleting a brand-new, uncommitted file just removes it entirely.
    if (existing.origin === 'new') {
      const files = { ...ws.files };
      delete files[p];
      return { ...ws, files };
    }
    return put(ws, { ...existing, content: null });
  }
  if (existsInTree(ws, p)) {
    return put(ws, { path: p, base: null, content: null, origin: 'repo', loaded: false });
  }
  return ws;
}

/** Restore a file to its repository baseline (discard workspace edits). */
export function revert(ws: WorkspaceData, path: string): WorkspaceData {
  const p = normalizePath(path);
  const existing = ws.files[p];
  if (!existing) return ws;
  if (existing.origin === 'new') {
    const files = { ...ws.files };
    delete files[p];
    return { ...ws, files };
  }
  return put(ws, { ...existing, content: existing.base });
}

export function isDirty(entry: FileEntry): boolean {
  if (entry.origin === 'new') return entry.content !== null;
  if (entry.content === null) return true; // deleted repo file
  return entry.content !== entry.base;
}

export function hasChanges(ws: WorkspaceData): boolean {
  return Object.values(ws.files).some(isDirty);
}

/** All dirty files as a review-ready change list. */
export function getChanges(ws: WorkspaceData): WorkspaceChange[] {
  const changes: WorkspaceChange[] = [];
  for (const entry of Object.values(ws.files)) {
    if (!isDirty(entry)) continue;
    if (entry.origin === 'new') changes.push({ path: entry.path, changeType: 'created' });
    else if (entry.content === null) changes.push({ path: entry.path, changeType: 'deleted' });
    else changes.push({ path: entry.path, changeType: 'modified' });
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Effective set of file paths in the workspace (for the explorer): every repo
 * blob that isn't deleted, plus any newly-created files.
 */
export function effectivePaths(ws: WorkspaceData): string[] {
  const set = new Set<string>(ws.treeBlobs);
  for (const entry of Object.values(ws.files)) {
    if (entry.origin === 'new' && entry.content !== null) set.add(entry.path);
    if (entry.content === null) set.delete(entry.path); // deleted
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** For the commit payload: files to write (create/modify) and paths to delete. */
export function commitPayload(ws: WorkspaceData): {
  writes: Array<{ path: string; content: string }>;
  deletes: string[];
} {
  const writes: Array<{ path: string; content: string }> = [];
  const deletes: string[] = [];
  for (const entry of Object.values(ws.files)) {
    if (!isDirty(entry)) continue;
    if (entry.content === null) {
      if (entry.origin === 'repo') deletes.push(entry.path);
    } else {
      writes.push({ path: entry.path, content: entry.content });
    }
  }
  return { writes, deletes };
}
