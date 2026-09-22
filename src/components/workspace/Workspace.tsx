import { useEffect, useState } from 'react';
import { useWorkspace } from '../../state/WorkspaceContext';
import { NetworkBadge } from '../ui';
import { Explorer } from './Explorer';
import { EditorPane } from './EditorPane';
import { AgentPanel } from './AgentPanel';
import { ChangesPanel } from './ChangesPanel';
import { CommitModal } from './CommitModal';

type Dock = 'agent' | 'changes';

export function Workspace({ onOpenAISettings }: { onOpenAISettings: () => void }) {
  const { repo, branch, changes, run } = useWorkspace();
  const [dock, setDock] = useState<Dock>('agent');
  const [commitOpen, setCommitOpen] = useState(false);

  // When the agent finishes applying changes, surface the Changes tab.
  useEffect(() => {
    if (run.phase === 'ready') setDock('changes');
  }, [run.phase]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sub-header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2 text-sm">
        <span className="mono text-ink">{repo?.name}</span>
        <span className="text-faint">/</span>
        <span className="mono text-muted">{branch}</span>
        {changes.length > 0 && (
          <span className="badge border-warning/30 bg-warning/10 text-warning">
            {changes.length} change{changes.length === 1 ? '' : 's'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {repo?.language && <NetworkBadge network={repo.language} />}
          <a
            href={repo?.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted hover:text-ink"
          >
            View on GitHub ↗
          </a>
        </div>
      </div>

      {/* Three-pane body */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border md:block">
          <Explorer />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col border-r border-border">
          <EditorPane />
        </section>

        <aside className="flex w-[26rem] shrink-0 flex-col">
          <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-1.5">
            {(['agent', 'changes'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDock(d)}
                className={`rounded px-3 py-1 text-xs capitalize ${
                  dock === d ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {d}
                {d === 'changes' && changes.length > 0 ? ` (${changes.length})` : ''}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {dock === 'agent' ? (
              <AgentPanel onViewChanges={() => setDock('changes')} onOpenAISettings={onOpenAISettings} />
            ) : (
              <ChangesPanel onCommit={() => setCommitOpen(true)} />
            )}
          </div>
        </aside>
      </div>

      <CommitModal open={commitOpen} onClose={() => setCommitOpen(false)} />
    </div>
  );
}
