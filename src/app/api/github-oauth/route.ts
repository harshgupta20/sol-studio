// Minimal OAuth token-exchange endpoint (the ONLY server-side piece).
//
// A browser cannot complete GitHub OAuth on its own: the code→token exchange
// requires the client SECRET and GitHub's token endpoint has no CORS. This tiny
// route handler does just that exchange and returns the user access token to the
// SPA. The secret lives only in the server environment — never in the frontend.
//
// Required environment variables (server-side, NOT NEXT_PUBLIC_*):
//   GITHUB_OAUTH_CLIENT_ID
//   GITHUB_OAUTH_CLIENT_SECRET

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Runs on Vercel's Node runtime. No caching — every request performs a live
// exchange with GitHub.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Permissive CORS so the endpoint also works when hosted on a separate origin.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request): Promise<Response> {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(
      {
        error: 'server_not_configured',
        error_description:
          'Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET in the deployment environment.',
      },
      500,
    );
  }

  let body: { code?: string; redirect_uri?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const code = body.code;
  const redirectUri = body.redirect_uri;
  if (!code) {
    return json({ error: 'missing_code' }, 400);
  }

  try {
    const ghRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = (await ghRes.json()) as {
      access_token?: string;
      scope?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    };
    if (data.error) {
      return json({ error: data.error, error_description: data.error_description }, 400);
    }
    // Return only what the client needs — never the client secret.
    return json(
      { access_token: data.access_token, scope: data.scope, token_type: data.token_type },
      200,
    );
  } catch (err) {
    return json(
      {
        error: 'exchange_failed',
        error_description: err instanceof Error ? err.message : 'Could not reach GitHub.',
      },
      502,
    );
  }
}
