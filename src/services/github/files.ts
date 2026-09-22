// Repository tree + file content reads.

import type { TreeEntry } from '../../types';
import type { GitHubClient } from './githubClient';
import { GitHubError } from './githubClient';
import { decodeBase64ToText, base64LooksBinary } from '../../utils/base64';

interface RawTree {
  sha: string;
  truncated: boolean;
  tree: Array<{ path: string; type: string; sha: string; size?: number; mode: string }>;
}

export interface RepositoryTree {
  entries: TreeEntry[];
  truncated: boolean;
}

/** Recursive tree at a commit/branch SHA. `truncated` = too big for one call. */
export async function getTree(
  client: GitHubClient,
  owner: string,
  repo: string,
  sha: string,
): Promise<RepositoryTree> {
  const raw = await client.request<RawTree>(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
  );
  const entries: TreeEntry[] = raw.tree
    .filter((e) => e.type === 'blob' || e.type === 'tree')
    .map((e) => ({
      path: e.path,
      type: e.type === 'tree' ? 'tree' : 'blob',
      sha: e.sha,
      size: e.size,
    }));
  return { entries, truncated: raw.truncated };
}

export interface BlobResult {
  text: string | null; // null when binary/too large
  binary: boolean;
  size: number;
}

const MAX_TEXT_BYTES = 1_000_000; // 1 MB per file cap for the editor/workspace

/** Fetch a blob by SHA and decode as UTF-8 text (or flag as binary/oversized). */
export async function getBlobText(
  client: GitHubClient,
  owner: string,
  repo: string,
  sha: string,
): Promise<BlobResult> {
  const raw = await client.request<{ content: string; encoding: string; size: number }>(
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
  );
  if (raw.encoding !== 'base64') {
    return { text: raw.content ?? '', binary: false, size: raw.size };
  }
  if (raw.size > MAX_TEXT_BYTES || base64LooksBinary(raw.content)) {
    return { text: null, binary: true, size: raw.size };
  }
  return { text: decodeBase64ToText(raw.content), binary: false, size: raw.size };
}

/** Read a file's text by path at a ref (used when we don't have the blob SHA). */
export async function getFileText(
  client: GitHubClient,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<BlobResult & { sha: string }> {
  const raw = await client.request<{
    content?: string;
    encoding?: string;
    size: number;
    sha: string;
    type: string;
  }>(`/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`);
  if (raw.type !== 'file' || raw.content === undefined) {
    throw new GitHubError(`Not a readable file: ${path}`, 422, 'validation');
  }
  if (raw.size > MAX_TEXT_BYTES || base64LooksBinary(raw.content)) {
    return { text: null, binary: true, size: raw.size, sha: raw.sha };
  }
  return {
    text: raw.encoding === 'base64' ? decodeBase64ToText(raw.content) : raw.content,
    binary: false,
    size: raw.size,
    sha: raw.sha,
  };
}
