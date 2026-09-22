// Client half of the GitHub OAuth web flow. The redirect + code exchange give a
// true one-click "Connect with GitHub". The secret token-exchange happens in the
// route handler (see src/app/api/github-oauth/route.ts); this module only kicks
// off the redirect and hands the returned `code` to that endpoint.
//
// If NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID is not set, `oauthConfigured()` is false
// and the UI falls back to the (server-free) personal-access-token flow.

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID;
const ENDPOINT = process.env.NEXT_PUBLIC_OAUTH_ENDPOINT ?? '/api/github-oauth';
const SCOPE = 'repo';
const STATE_KEY = 'sol-studio.gh.oauth_state';
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

/** True when an OAuth App client id is configured (enables the one-click button). */
export function oauthConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

/** The exact redirect URI used for both authorize and exchange (must match). */
function redirectUri(): string {
  return window.location.origin + window.location.pathname;
}

/** Begin the OAuth web flow: store a CSRF state, then redirect to GitHub. */
export function beginOAuth(): void {
  if (!CLIENT_ID) return;
  const state =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* private mode — state check will simply fail closed */
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', state);
  window.location.assign(url.toString());
}

/** Read `?code`/`?state` from the current URL (present after GitHub redirects back). */
export function readOAuthCallback(): { code: string; state: string } | null {
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code');
  const state = p.get('state');
  return code && state ? { code, state } : null;
}

/** True if the returned state matches the one we stored (CSRF protection). */
export function verifyState(state: string): boolean {
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
  return Boolean(saved) && saved === state;
}

/** Strip the OAuth query params from the URL (so a refresh doesn't re-run it). */
export function clearOAuthParams(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, document.title, url.toString());
}

/** Exchange the authorization code for a user access token via the serverless endpoint. */
export async function exchangeOAuthCode(code: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri() }),
    });
  } catch {
    throw new Error(
      'Could not reach the OAuth endpoint. Is the serverless function deployed? You can paste a token instead.',
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'GitHub sign-in failed.');
  }
  return data.access_token;
}
