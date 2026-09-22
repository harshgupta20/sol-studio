// AI provider configuration. The API key lives in memory by default; persisted
// to sessionStorage ONLY on explicit opt-in. The (non-secret) provider + model
// choice is remembered in localStorage. Keys are never logged or committed.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AIConfig, AIProviderId } from '../types';
import { defaultModelFor, validateKey } from '../services/ai';
import { readJSON, remove, writeJSON } from '../utils/storage';

const KEY_STORAGE = 'sol-studio.ai.key';
const PREF_STORAGE = 'sol-studio.ai.pref';

interface AIState {
  configured: boolean;
  config: AIConfig | null;
  provider: AIProviderId;
  model: string;
  keyPersisted: boolean;
  configure: (input: {
    apiKey: string;
    model?: string;
    provider?: AIProviderId;
    persist?: boolean;
  }) => Promise<void>;
  clearKey: () => void;
}

const Ctx = createContext<AIState | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
  const pref = readJSON<{ provider: AIProviderId; model: string }>('local', PREF_STORAGE, {
    provider: 'anthropic',
    model: defaultModelFor('anthropic'),
  });
  const initialProvider: AIProviderId = pref.provider || 'anthropic';

  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(pref.model || defaultModelFor(initialProvider));
  const [provider, setProvider] = useState<AIProviderId>(initialProvider);
  const [keyPersisted, setKeyPersisted] = useState(false);

  const configure = useCallback<AIState['configure']>(
    async ({ apiKey: key, model: m, provider: p, persist }) => {
      const trimmed = key.trim();
      const finalProvider = p ?? provider;
      const finalModel = (m ?? model).trim() || defaultModelFor(finalProvider);
      await validateKey(finalProvider, trimmed, finalModel);
      setApiKey(trimmed);
      setModel(finalModel);
      setProvider(finalProvider);
      writeJSON('local', PREF_STORAGE, { provider: finalProvider, model: finalModel });
      if (persist) {
        // Remembered across restarts.
        writeJSON('local', KEY_STORAGE, trimmed);
        remove('session', KEY_STORAGE);
        setKeyPersisted(true);
      } else {
        // Tab-only.
        writeJSON('session', KEY_STORAGE, trimmed);
        remove('local', KEY_STORAGE);
        setKeyPersisted(false);
      }
    },
    [model, provider],
  );

  const clearKey = useCallback(() => {
    setApiKey('');
    setKeyPersisted(false);
    remove('local', KEY_STORAGE);
    remove('session', KEY_STORAGE);
  }, []);

  // Restore a saved key on load (localStorage first, then session).
  useEffect(() => {
    const local = readJSON<string | null>('local', KEY_STORAGE, null);
    const session = readJSON<string | null>('session', KEY_STORAGE, null);
    const saved = local ?? session;
    if (saved) {
      setApiKey(saved);
      setKeyPersisted(Boolean(local));
    }
  }, []);

  const config = useMemo<AIConfig | null>(
    () => (apiKey ? { provider, apiKey, model } : null),
    [apiKey, provider, model],
  );

  const value = useMemo<AIState>(
    () => ({
      configured: Boolean(apiKey),
      config,
      provider,
      model,
      keyPersisted,
      configure,
      clearKey,
    }),
    [apiKey, config, provider, model, keyPersisted, configure, clearKey],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAI(): AIState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
