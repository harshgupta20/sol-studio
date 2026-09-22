import type { ReactNode } from 'react';
import { useAI } from '../state/AIContext';
import { useGitHub } from '../state/GitHubContext';
import { useWorkspace } from '../state/WorkspaceContext';
import { Wordmark } from './ui';
import { ProviderIcon } from './ai/ProviderIcon';

export type View = 'dashboard' | 'repositories' | 'workspace';

const NAV: { key: View; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'repositories', label: 'Repositories' },
  { key: 'workspace', label: 'Workspace' },
];

export function AppShell({
  view,
  onNavigate,
  onOpenAISettings,
  children,
}: {
  view: View;
  onNavigate: (v: View) => void;
  onOpenAISettings: () => void;
  children: ReactNode;
}) {
  const gh = useGitHub();
  const ai = useAI();
  const { repo } = useWorkspace();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <header className="shrink-0 border-b border-border bg-base/95 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => onNavigate('dashboard')}
            title="Dashboard"
          >
            <Wordmark className="text-sm" />
          </button>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV.map((n) => {
              const disabled = n.key === 'workspace' && !repo;
              const active = view === n.key;
              return (
                <button
                  key={n.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onNavigate(n.key)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? 'bg-elevated font-medium text-ink'
                      : 'text-muted hover:bg-elevated/50 hover:text-ink'
                  }`}
                >
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAISettings}
              className={`mono flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                ai.configured
                  ? 'border-border bg-panel text-muted hover:border-borderStrong'
                  : 'border-warning/40 bg-warning/10 text-warning'
              }`}
              title="AI provider settings"
            >
              <ProviderIcon provider={ai.provider} size={15} className={ai.configured ? '' : 'opacity-45'} />
              {ai.configured ? shortModel(ai.model) : 'Set AI key'}
            </button>

            {gh.user && (
              <div className="flex items-center gap-2">
                <img
                  src={gh.user.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full border border-border"
                />
                <button
                  type="button"
                  onClick={gh.disconnect}
                  className="text-xs text-muted transition-colors hover:text-error"
                  title="Disconnect GitHub"
                >
                  {gh.user.login} · Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}
