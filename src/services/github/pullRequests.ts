// Pull request creation + listing. We never auto-merge — the PR is the handoff.

import type { PullRequest } from '../../types';
import type { GitHubClient } from './githubClient';

interface RawPR {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  head: { ref: string };
  base: { ref: string };
}

function mapPR(p: RawPR): PullRequest {
  return {
    number: p.number,
    title: p.title,
    htmlUrl: p.html_url,
    state: p.state,
    head: p.head.ref,
    base: p.base.ref,
    draft: Boolean(p.draft),
  };
}

export interface CreatePRInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string; // feature branch
  base: string; // target branch
  draft?: boolean;
}

export async function createPullRequest(
  client: GitHubClient,
  input: CreatePRInput,
): Promise<PullRequest> {
  const raw = await client.request<RawPR>(`/repos/${input.owner}/${input.repo}/pulls`, {
    method: 'POST',
    body: {
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
      draft: input.draft ?? false,
    },
  });
  return mapPR(raw);
}

/** Find an existing open PR for a head branch, if one exists. */
export async function findOpenPullRequest(
  client: GitHubClient,
  owner: string,
  repo: string,
  head: string,
): Promise<PullRequest | null> {
  const raw = await client.request<RawPR[]>(
    `/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${head}`)}`,
  );
  return raw.length ? mapPR(raw[0]) : null;
}
