// Commit a set of file changes to a branch using GitHub's Git Data API.
// This is the robust multi-file path: create blobs → build a tree on top of the
// branch's base tree (with deletes as null-SHA entries) → create a commit →
// fast-forward the branch ref. Handles create/modify/delete/move uniformly.

import type { GitHubClient } from './githubClient';
import { encodeTextToBase64 } from '../../utils/base64';

export interface FileWrite {
  path: string;
  content: string;
}

export interface CommitChangesInput {
  owner: string;
  repo: string;
  branch: string;
  /** Parent commit SHA (current branch head). */
  baseSha: string;
  message: string;
  writes: FileWrite[];
  deletes: string[];
}

export interface CommitResult {
  commitSha: string;
  treeSha: string;
}

const FILE_MODE = '100644';

export async function commitChanges(
  client: GitHubClient,
  input: CommitChangesInput,
): Promise<CommitResult> {
  const { owner, repo, branch, baseSha, message, writes, deletes } = input;
  const base = `/repos/${owner}/${repo}`;

  // 1. Base tree of the parent commit.
  const baseCommit = await client.request<{ tree: { sha: string } }>(
    `${base}/git/commits/${baseSha}`,
  );

  // 2. Create a blob per written file (base64 keeps any encoding intact).
  const writeEntries = await Promise.all(
    writes.map(async (w) => {
      const blob = await client.request<{ sha: string }>(`${base}/git/blobs`, {
        method: 'POST',
        body: { content: encodeTextToBase64(w.content), encoding: 'base64' },
      });
      return { path: w.path, mode: FILE_MODE, type: 'blob' as const, sha: blob.sha };
    }),
  );

  // 3. Deletions: a null SHA removes the path from the new tree.
  const deleteEntries = deletes.map((path) => ({
    path,
    mode: FILE_MODE,
    type: 'blob' as const,
    sha: null,
  }));

  const tree = await client.request<{ sha: string }>(`${base}/git/trees`, {
    method: 'POST',
    body: { base_tree: baseCommit.tree.sha, tree: [...writeEntries, ...deleteEntries] },
  });

  // 4. Create the commit.
  const commit = await client.request<{ sha: string }>(`${base}/git/commits`, {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [baseSha] },
  });

  // 5. Fast-forward the branch ref to the new commit.
  await client.request(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: { sha: commit.sha, force: false },
  });

  return { commitSha: commit.sha, treeSha: tree.sha };
}
