import { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { useAI } from '../../state/AIContext';
import { AIError, PROVIDERS, PROVIDER_LIST, defaultModelFor } from '../../services/ai';
import type { AIProviderId } from '../../types';
import { Banner, Spinner } from '../ui';
import { ProviderIcon } from './ProviderIcon';

export function AISettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ai = useAI();
  const [provider, setProvider] = useState<AIProviderId>(ai.provider);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(ai.model || defaultModelFor(ai.provider));
  const [persist, setPersist] = useState(ai.keyPersisted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const meta = PROVIDERS[provider];

  useEffect(() => {
    if (open) {
      setProvider(ai.provider);
      setModel(ai.model || defaultModelFor(ai.provider));
      // Default to remembering (persist) unless the user previously chose tab-only.
      setPersist(ai.configured ? ai.keyPersisted : true);
      setError(null);
      setSaved(false);
      setKey('');
    }
  }, [open, ai.provider, ai.model, ai.keyPersisted, ai.configured]);

  const onProviderChange = (p: AIProviderId) => {
    setProvider(p);
    // Reset the model to the newly-selected provider's default.
    setModel(defaultModelFor(p));
    setError(null);
  };

  const save = async () => {
    if (!key.trim()) {
      setError(`Enter your ${meta.keyLabel}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ai.configure({ apiKey: key, model, provider, persist });
      setSaved(true);
      setKey('');
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err instanceof AIError ? err.message : 'Could not validate the key.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="AI provider settings">
      <div className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
            Provider
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onProviderChange(p.id)}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  provider === p.id
                    ? 'border-sol/60 bg-sol/10 text-ink'
                    : 'border-border bg-surface text-muted hover:border-borderStrong'
                }`}
              >
                <ProviderIcon provider={p.id} size={20} glow={provider === p.id} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
            Model
          </label>
          <input
            className="input mono"
            list="ai-model-suggestions"
            value={model}
            spellCheck={false}
            onChange={(e) => setModel(e.target.value)}
            placeholder={meta.defaultModel}
          />
          <datalist id="ai-model-suggestions">
            {meta.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-faint">
            Pick a suggestion or type any {meta.label} model id.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
            {meta.keyLabel} {ai.configured && ai.provider === provider && <span className="text-success">(set)</span>}
          </label>
          <input
            type="password"
            className="input mono"
            placeholder={ai.configured && ai.provider === provider ? 'Enter a new key to replace…' : meta.keyPlaceholder}
            value={key}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
          />
          <p className="mt-1 text-[11px] text-faint">{meta.keyHelp}</p>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={persist}
            onChange={(e) => setPersist(e.target.checked)}
          />
          <span>
            Keep on this device.{' '}
            <span className="text-faint">
              Stored in your browser so you won't re-enter it next time. Turn off on shared
              machines (kept for this tab only).
            </span>
          </span>
        </label>

        <Banner kind="info">
          Your key stays in your browser and is sent only to {meta.label}'s API. It is never
          logged, never committed, and never included in generated files.
        </Banner>

        {error && <Banner>{error}</Banner>}
        {saved && <Banner kind="success">Key validated and saved.</Banner>}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          {ai.configured ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                ai.clearKey();
                onClose();
              }}
            >
              Clear key
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? (
              <>
                <Spinner /> Validating…
              </>
            ) : (
              'Save key'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
