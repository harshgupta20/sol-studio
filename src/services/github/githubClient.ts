// Low-level GitHub REST client. Runs entirely in the browser against
// https://api.github.com (which serves permissive CORS headers for token auth).
// This is the single choke point for every GitHub call — auth, error shaping,
// rate-limit detection, and pagination all live here.

export const GITHUB_API_BASE =
  // Next inlines NEXT_PUBLIC_* at build time; it's a plain string | undefined and
  // is safe to read on both the server and the client.
  process.env.NEXT_PUBLIC_GITHUB_API_BASE?.replace(/\/$/, '') ?? 'https://api.github.com';
const DEFAULT_BASE = GITHUB_API_BASE;
const API_VERSION = '2022-11-28';

export type GitHubErrorCode =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'http';

export class GitHubError extends Error {
  status: number;
  code: GitHubErrorCode;
  documentationUrl?: string;
  /** Seconds until the rate limit resets, when known. */
  retryAfterSec?: number;

  constructor(
    message: string,
    status: number,
    code: GitHubErrorCode,
    extra?: { documentationUrl?: string; retryAfterSec?: number },
  ) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.code = code;
    this.documentationUrl = extra?.documentationUrl;
    this.retryAfterSec = extra?.retryAfterSec;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Return the raw Response instead of parsed JSON (used for blobs). */
  signal?: AbortSignal;
}

function codeForStatus(status: number, rateLimited: boolean): GitHubErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return rateLimited ? 'rate_limited' : 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  return 'http';
}

export class GitHubClient {
  readonly token: string;
  private readonly baseUrl: string;

  constructor(token: string, baseUrl: string = DEFAULT_BASE) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      ...extra,
    };
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method: opts.method ?? 'GET',
      headers: this.authHeaders(
        opts.body !== undefined ? { 'Content-Type': 'application/json', ...opts.headers } : opts.headers,
      ),
      signal: opts.signal,
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown';
      throw new GitHubError(
        `Network error reaching GitHub (${detail}). Check your connection.`,
        0,
        'network',
      );
    }

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!res.ok) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      const rateLimited = res.status === 403 && remaining === '0';
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? '0');
      const retryAfterSec = reset ? Math.max(0, reset - Math.floor(Date.now() / 1000)) : undefined;
      const b = (body ?? {}) as { message?: string; documentation_url?: string };
      let message = b.message ?? `GitHub request failed (${res.status}).`;
      if (rateLimited) {
        message = `GitHub API rate limit exceeded.${
          retryAfterSec ? ` Try again in ~${Math.ceil(retryAfterSec / 60)} min.` : ''
        }`;
      } else if (res.status === 401) {
        message = 'GitHub token is invalid or expired. Reconnect with a valid token.';
      }
      throw new GitHubError(message, res.status, codeForStatus(res.status, rateLimited), {
        documentationUrl: b.documentation_url,
        retryAfterSec,
      });
    }

    return body as T;
  }

  /** Follow RFC-5988 `Link: rel="next"` pagination, collecting all pages. */
  async paginate<T>(path: string, opts: { perPage?: number; max?: number } = {}): Promise<T[]> {
    const perPage = opts.perPage ?? 100;
    const max = opts.max ?? 1000;
    const sep = path.includes('?') ? '&' : '?';
    let url: string | null = `${this.baseUrl}${path}${sep}per_page=${perPage}`;
    const out: T[] = [];

    while (url && out.length < max) {
      const res: Response = await fetch(url, { headers: this.authHeaders() });
      if (!res.ok) {
        // Reuse request()'s error shaping by delegating on the failing URL.
        await this.request<T>(url);
        break;
      }
      const page = (await res.json()) as T[];
      out.push(...page);
      url = parseNextLink(res.headers.get('link'));
    }
    return out;
  }
}

function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}
