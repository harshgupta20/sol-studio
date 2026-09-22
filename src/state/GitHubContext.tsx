// GitHub session state.
//
// Persistence tiers (user's choice at connect time):
//   remember = true  → localStorage: survives refresh AND browser restart
//                      ("keep me signed in on this device").
//   remember = false → sessionStorage: survives refresh, cleared when the tab
//                      closes (a safer default for shared machines).
// The token is never sent anywhere except GitHub's API. Storing it in the
// browser means anyone with access to this browser profile can read it — hence
// the explicit opt-in and the recommendation to use a fine-grained, expiring
// token. See SECURITY in the README.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GitHubUser } from '../types';
import {
  authenticate,
  canWriteRepos,
  GitHubClient,
  type AuthResult,
} from '../services/github';
import { readJSON, remove, writeJSON } from '../utils/storage';

const TOKEN_KEY = 'sol-studio.gh.token';

interface GitHubState {
  connected: boolean;
  user: GitHubUser | null;
  scopes: string[] | null;
  canWrite: boolean;
  /** True when the token is persisted in localStorage (survives restarts). */
  remembered: boolean;
  /** True while a saved token is being validated on load. */
  restoring: boolean;
  client: GitHubClient | null;
  connect: (token: string, remember: boolean) => Promise<AuthResult>;
  disconnect: () => void;
}

const Ctx = createContext<GitHubState | null>(null);

export function GitHubProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [scopes, setScopes] = useState<string[] | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const clientRef = useRef<GitHubClient | null>(null);
  const [, force] = useState(0);

  const applyAuth = useCallback((token: string, auth: AuthResult, isRemembered: boolean) => {
    clientRef.current = new GitHubClient(token);
    setUser(auth.user);
    setScopes(auth.scopes);
    setCanWrite(canWriteRepos(auth));
    setRemembered(isRemembered);
    force((n) => n + 1);
  }, []);

  const connect = useCallback(
    async (token: string, remember: boolean): Promise<AuthResult> => {
      const trimmed = token.trim();
      const auth = await authenticate(trimmed);
      if (remember) {
        writeJSON('local', TOKEN_KEY, trimmed);
        remove('session', TOKEN_KEY);
      } else {
        writeJSON('session', TOKEN_KEY, trimmed);
        remove('local', TOKEN_KEY);
      }
      applyAuth(trimmed, auth, remember);
      return auth;
    },
    [applyAuth],
  );

  const disconnect = useCallback(() => {
    clientRef.current = null;
    remove('local', TOKEN_KEY);
    remove('session', TOKEN_KEY);
    setUser(null);
    setScopes(null);
    setCanWrite(false);
    setRemembered(false);
    force((n) => n + 1);
  }, []);

  // Restore a saved token on load — localStorage (remembered) first, then session.
  useEffect(() => {
    const local = readJSON<string | null>('local', TOKEN_KEY, null);
    const session = readJSON<string | null>('session', TOKEN_KEY, null);
    const saved = local ?? session;
    if (!saved) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    authenticate(saved)
      .then((auth) => {
        if (!cancelled) applyAuth(saved, auth, Boolean(local));
      })
      .catch(() => {
        // Token expired/revoked — clear it so we don't loop on a bad token.
        remove('local', TOKEN_KEY);
        remove('session', TOKEN_KEY);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyAuth]);

  const value = useMemo<GitHubState>(
    () => ({
      connected: Boolean(user),
      user,
      scopes,
      canWrite,
      remembered,
      restoring,
      client: clientRef.current,
      connect,
      disconnect,
    }),
    // clientRef is a ref; force() re-renders when it changes.
    [user, scopes, canWrite, remembered, restoring, connect, disconnect],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGitHub(): GitHubState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGitHub must be used within GitHubProvider');
  return ctx;
}
