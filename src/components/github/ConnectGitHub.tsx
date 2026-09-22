import { useEffect, useRef, useState } from 'react';
import { useGitHub } from '../../state/GitHubContext';
import {
  GitHubError,
  beginOAuth,
  clearOAuthParams,
  exchangeOAuthCode,
  oauthConfigured,
  readOAuthCallback,
  verifyState,
} from '../../services/github';
import { Banner, Spinner, Wordmark } from '../ui';
import { AISettingsModal } from '../ai/AISettingsModal';

// Opens GitHub's token page with the repo scope pre-selected so committing +
// PRs work. (A true one-click OAuth needs a client secret + a token-exchange
// server; this app has no backend, so we streamline token creation instead.)
const CLASSIC_TOKEN_URL =
  'https://github.com/settings/tokens/new?description=Solana%20Studio&scopes=repo';
const FINE_GRAINED_URL = 'https://github.com/settings/personal-access-tokens/new';

function GitHubGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.83 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function ConnectGitHub({
  onOpenAISettings,
  aiOpen,
  onCloseAI,
}: {
  onOpenAISettings: () => void;
  aiOpen: boolean;
  onCloseAI: () => void;
}) {
  const gh = useGitHub();
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(() => Boolean(readOAuthCallback()));
  const hasOAuth = oauthConfigured();

  // Keep a live ref to `gh` so the once-only OAuth effect can call the latest
  // `connect` without depending on `gh`'s identity (which changes when the
  // restore check finishes) — that would otherwise re-run the effect and consume
  // the one-time OAuth `state` twice.
  const ghRef = useRef(gh);
  ghRef.current = gh;
  const oauthStarted = useRef(false);

  // Complete the OAuth web flow when GitHub redirects back with ?code&state.
  useEffect(() => {
    if (oauthStarted.current) return;
    const cb = readOAuthCallback();
    if (!cb) return;
    oauthStarted.current = true;
    (async () => {
      try {
        if (!verifyState(cb.state)) throw new Error('Sign-in expired or was tampered with. Please try again.');
        const t = await exchangeOAuthCode(cb.code);
        clearOAuthParams();
        // Already on /app — connecting flips the workspace into its next view.
        await ghRef.current.connect(t, true);
      } catch (err) {
        clearOAuthParams();
        setError(err instanceof Error ? err.message : 'GitHub sign-in failed.');
        setOauthBusy(false);
      }
    })();
  }, []);

  const connect = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const auth = await gh.connect(token, remember);
      if (auth.scopes && !auth.scopes.includes('repo') && !auth.scopes.includes('public_repo')) {
        setWarning(
          'This token has no repo scope — you can browse but not create branches, commits, or PRs.',
        );
      }
    } catch (err) {
      setError(err instanceof GitHubError ? err.message : 'Could not connect to GitHub.');
    } finally {
      setBusy(false);
    }
  };

  // While a remembered token is validated (or an OAuth redirect completes),
  // don't flash the form.
  if (gh.restoring || oauthBusy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <span className="flex items-center gap-3 text-sm text-muted">
          <Spinner /> {oauthBusy ? 'Finishing sign-in with GitHub…' : 'Restoring your session…'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-sm text-muted">
            An AI-powered GitHub engineering workspace that runs entirely in your browser.
          </p>
        </div>

        <div className="card p-6">
          <h1 className="text-sm font-semibold text-ink">Connect GitHub</h1>
          <p className="mt-1 text-xs text-muted">
            Connect a repository to begin. Generate a scoped token on GitHub, paste it once, and
            stay signed in — the token stays in this browser and is sent only to GitHub's API.
          </p>

          {/* Primary — one-click OAuth when configured, else guided token creation */}
          {hasOAuth ? (
            <>
              <button
                type="button"
                onClick={beginOAuth}
                className="btn-primary mt-4 w-full justify-center gap-2 py-2.5 text-sm font-semibold"
              >
                <GitHubGlyph />
                Connect with GitHub
              </button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
                Authorize on GitHub — one click, nothing to copy. You'll come right back, signed in.
              </p>
            </>
          ) : (
            <>
              <a
                href={CLASSIC_TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpened(true)}
                className="btn-ghost mt-4 w-full justify-center gap-2 border-borderStrong bg-elevated py-2.5 text-sm font-semibold hover:border-sol/50"
              >
                <GitHubGlyph />
                Connect with GitHub
                <span aria-hidden>↗</span>
              </a>
              <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
                Opens GitHub with the <span className="mono text-muted">repo</span> scope
                preselected. Click <span className="text-muted">Generate token</span>, copy it, then
                paste it below. Prefer least-privilege?{' '}
                <a href={FINE_GRAINED_URL} target="_blank" rel="noreferrer" className="text-muted underline hover:text-ink">
                  Use a fine-grained token
                </a>{' '}
                (Contents + Pull requests: Read &amp; write).
              </p>
            </>
          )}

          {hasOAuth && (
            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-faint">
              <span className="h-px flex-1 bg-border" />
              or paste a token
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Token paste + connect (always available, and the only path with no backend) */}
          <label className={`block text-[11px] font-semibold uppercase tracking-wider text-faint ${hasOAuth ? '' : 'mt-5'}`}>
            {opened ? '2 · Paste your token' : 'Paste your token'}
          </label>
          <input
            type="password"
            className="input mono mt-1"
            placeholder="Paste your token — github_pat_… or ghp_…"
            value={token}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void connect();
            }}
          />

          <label className="mt-3 flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>
              Keep me signed in on this device.{' '}
              <span className="text-faint">
                Stored in this browser so you won't reconnect next time. Turn off on shared
                machines; a fine-grained, expiring token is safest.
              </span>
            </span>
          </label>

          {error && <Banner className="mt-3">{error}</Banner>}
          {warning && (
            <Banner kind="warning" className="mt-3">
              {warning}
            </Banner>
          )}

          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={busy || !token.trim()}
            onClick={() => void connect()}
          >
            {busy ? (
              <>
                <Spinner /> Connecting…
              </>
            ) : (
              'Connect GitHub'
            )}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-faint">
          <span>Step 1 of 2 · then add your AI key</span>
          <button type="button" className="text-muted hover:text-ink" onClick={onOpenAISettings}>
            AI settings →
          </button>
        </div>
      </div>

      <AISettingsModal open={aiOpen} onClose={onCloseAI} />
    </div>
  );
}
