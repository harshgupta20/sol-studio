// Validation + application of AI-generated file operations. AI output is
// untrusted: every operation is validated (path safety, existence, size,
// supported type) before it is allowed to touch the virtual workspace.

import type { FileOperation, ValidatedOperation } from '../../types';
import { checkRepoPath, normalizePath } from '../../utils/paths';
import type { WorkspaceData } from '../../workspace/virtualWorkspace';
import {
  createNew,
  existsInTree,
  getEntry,
  markDeleted,
  putBaseline,
  setContent,
} from '../../workspace/virtualWorkspace';

const MAX_CONTENT_BYTES = 1_500_000;
const SUPPORTED = new Set(['create', 'modify', 'delete', 'move']);

/**
 * Validate a batch of operations against the workspace, simulating the running
 * set of existing paths so an op can reference a file an earlier op created.
 */
export function validateOperations(
  ops: FileOperation[],
  ws: WorkspaceData,
): ValidatedOperation[] {
  // Seed the "exists" set from the repo tree + non-deleted workspace files.
  const exists = new Set<string>(ws.treeBlobs);
  for (const e of Object.values(ws.files)) {
    if (e.content === null) exists.delete(e.path);
    else exists.add(e.path);
  }

  return ops.map((operation) => {
    const res = validateOne(operation, exists);
    // Advance the simulated filesystem so later ops see this one's effect.
    if (res.ok) applyToExistsSet(operation, exists);
    return res;
  });
}

function validateOne(op: FileOperation, exists: Set<string>): ValidatedOperation {
  const fail = (reason: string): ValidatedOperation => ({ operation: op, ok: false, reason });

  if (!op || typeof op !== 'object') return fail('Malformed operation.');
  if (!SUPPORTED.has(op.type)) return fail(`Unsupported operation type "${op.type}".`);

  const pathCheck = checkRepoPath(op.path);
  if (!pathCheck.ok) return fail(pathCheck.reason ?? 'Invalid path.');
  const path = normalizePath(op.path);

  if (op.type === 'create' || op.type === 'modify') {
    if (typeof op.content !== 'string') return fail('Missing file content.');
    if (op.content.length > MAX_CONTENT_BYTES) return fail('File content is too large.');
    if (op.type === 'modify' && !exists.has(path)) {
      return fail('Cannot modify a file that does not exist.');
    }
    return { operation: op, ok: true };
  }

  if (op.type === 'delete') {
    if (!exists.has(path)) return fail('Cannot delete a file that does not exist.');
    return { operation: op, ok: true };
  }

  // move
  if (typeof op.from !== 'string') return fail('Move requires a "from" path.');
  const fromCheck = checkRepoPath(op.from);
  if (!fromCheck.ok) return fail(`Invalid source path: ${fromCheck.reason}`);
  const from = normalizePath(op.from);
  if (from === path) return fail('Move source and destination are identical.');
  if (!exists.has(from)) return fail('Cannot move a file that does not exist.');
  return { operation: op, ok: true };
}

function applyToExistsSet(op: FileOperation, exists: Set<string>): void {
  const path = normalizePath(op.path);
  if (op.type === 'create' || op.type === 'modify') exists.add(path);
  else if (op.type === 'delete') exists.delete(path);
  else if (op.type === 'move' && op.from) {
    exists.delete(normalizePath(op.from));
    exists.add(path);
  }
}

export type ReadFile = (path: string) => Promise<string | null>;

export interface ApplyResult {
  ws: WorkspaceData;
  applied: string[];
  skipped: Array<{ path: string; reason: string }>;
}

/**
 * Apply validated operations to the workspace. Fetches baseline content for
 * modify/delete/move targets that aren't loaded yet so diffs are accurate.
 */
export async function applyOperations(
  ws: WorkspaceData,
  validated: ValidatedOperation[],
  readFile: ReadFile,
): Promise<ApplyResult> {
  let next = ws;
  const applied: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  const ensureBaseline = async (path: string) => {
    if (getEntry(next, path)?.loaded) return;
    if (!existsInTree(next, path)) return;
    const text = await readFile(path).catch(() => null);
    next = putBaseline(next, path, { base: text, binary: text === null });
  };

  for (const v of validated) {
    if (!v.ok) {
      skipped.push({ path: v.operation.path, reason: v.reason ?? 'invalid' });
      continue;
    }
    const op = v.operation;
    const path = normalizePath(op.path);
    try {
      if (op.type === 'create') {
        if (existsInTree(next, path)) {
          await ensureBaseline(path);
          next = setContent(next, path, op.content ?? '');
        } else {
          next = createNew(next, path, op.content ?? '');
        }
      } else if (op.type === 'modify') {
        await ensureBaseline(path);
        next = setContent(next, path, op.content ?? '');
      } else if (op.type === 'delete') {
        await ensureBaseline(path);
        next = markDeleted(next, path);
      } else if (op.type === 'move' && op.from) {
        const from = normalizePath(op.from);
        await ensureBaseline(from);
        const src = getEntry(next, from);
        const content = op.content ?? src?.content ?? '';
        next = markDeleted(next, from);
        if (existsInTree(next, path)) {
          await ensureBaseline(path);
          next = setContent(next, path, content);
        } else {
          next = createNew(next, path, content);
        }
      }
      applied.push(path);
    } catch (err) {
      skipped.push({
        path,
        reason: err instanceof Error ? err.message : 'apply failed',
      });
    }
  }

  return { ws: next, applied, skipped };
}
