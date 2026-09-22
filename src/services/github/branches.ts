// Branch listing, head lookup, and feature-branch creation.

import type { Branch } from '../../types';
import type { GitHubClient } from './githubClient';

interface RawBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

export async function listBranches(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<Branch[]> {
  const raw = await client.paginate<RawBranch>(`/repos/${owner}/${repo}/branches`, {
    perPage: 100,
    max: 300,
  });
  return raw.map((b) => ({ name: b.name, commitSha: b.commit.sha, protected: b.protected }));
}

/** Resolve the head commit SHA of a branch. */
export async function getBranchHeadSha(
  client: GitHubClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const ref = await client.request<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  return ref.object.sha;
}

/** Create a new branch pointing at `fromSha`. */
export async function createBranch(
  client: GitHubClient,
  owner: string,
  repo: string,
  newBranch: string,
  fromSha: string,
): Promise<void> {
  await client.request(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: { ref: `refs/heads/${newBranch}`, sha: fromSha },
  });
}

export async function branchExists(
  client: GitHubClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> {
  try {
    await getBranchHeadSha(client, owner, repo, branch);
    return true;
  } catch {
    return false;
  }
}
