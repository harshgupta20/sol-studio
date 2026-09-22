// Authentication against GitHub with a user-supplied token (classic PAT or
// fine-grained token). We validate by calling /user, and — for classic tokens —
// read the granted scopes from the `x-oauth-scopes` header so the UI can warn
// when `repo` access is missing.

import type { GitHubUser } from '../../types';
import { GITHUB_API_BASE, GitHubClient, GitHubError } from './githubClient';

export interface AuthResult {
  user: GitHubUser;
  /** Classic-PAT scopes, or null for fine-grained tokens (which don't expose them). */
  scopes: string[] | null;
  tokenType: 'classic' | 'fine-grained' | 'unknown';
}

interface RawUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export function mapUser(u: RawUser): GitHubUser {
  return { login: u.login, name: u.name, avatarUrl: u.avatar_url, htmlUrl: u.html_url };
}

export async function authenticate(token: string): Promise<AuthResult> {
  const trimmed = token.trim();
  if (!trimmed) throw new GitHubError('Please provide a GitHub token.', 0, 'unauthorized');

  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${trimmed}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    throw new GitHubError(`Network error reaching GitHub (${detail}).`, 0, 'network');
  }

  if (res.status === 401) {
    throw new GitHubError('That GitHub token is invalid or expired.', 401, 'unauthorized');
  }
  if (!res.ok) {
    throw new GitHubError(`GitHub rejected the token (${res.status}).`, res.status, 'http');
  }

  const raw = (await res.json()) as RawUser;
  const scopeHeader = res.headers.get('x-oauth-scopes');
  const tokenTypeHeader = res.headers.get('x-github-token-type') ?? '';

  let scopes: string[] | null = null;
  let tokenType: AuthResult['tokenType'] = 'unknown';
  if (scopeHeader !== null) {
    scopes = scopeHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    tokenType = 'classic';
  } else if (/pat/i.test(tokenTypeHeader) || trimmed.startsWith('github_pat_')) {
    tokenType = 'fine-grained';
  }

  return { user: mapUser(raw), scopes, tokenType };
}

/** True when a classic token can write repos (fine-grained → unknown, assume ok). */
export function canWriteRepos(auth: AuthResult): boolean {
  if (auth.scopes === null) return true; // fine-grained: scopes not enumerable
  return auth.scopes.includes('repo') || auth.scopes.includes('public_repo');
}

export function makeClient(token: string): GitHubClient {
  return new GitHubClient(token);
}
