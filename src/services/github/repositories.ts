// Repository listing + lookup.

import type { Repo } from '../../types';
import type { GitHubClient } from './githubClient';

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  description: string | null;
  language: string | null;
  updated_at: string;
  html_url: string;
  permissions?: { push?: boolean; admin?: boolean; maintain?: boolean };
}

function mapRepo(r: RawRepo): Repo {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    private: r.private,
    defaultBranch: r.default_branch,
    description: r.description,
    language: r.language,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    canPush: Boolean(r.permissions?.push ?? r.permissions?.admin ?? r.permissions?.maintain),
  };
}

/** Repos the user owns or collaborates on, most-recently-updated first. */
export async function listRepositories(client: GitHubClient): Promise<Repo[]> {
  const raw = await client.paginate<RawRepo>(
    '/user/repos?sort=updated&affiliation=owner,collaborator,organization_member',
    { perPage: 100, max: 500 },
  );
  return raw.map(mapRepo);
}

export async function getRepository(
  client: GitHubClient,
  owner: string,
  name: string,
): Promise<Repo> {
  const raw = await client.request<RawRepo>(`/repos/${owner}/${name}`);
  return mapRepo(raw);
}
