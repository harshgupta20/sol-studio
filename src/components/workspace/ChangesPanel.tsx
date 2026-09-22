import { useWorkspace } from '../../state/WorkspaceContext';
import { useGitHub } from '../../state/GitHubContext';
import { Banner, CHANGE_MARK } from '../ui';

export function ChangesPanel({ onCommit }: { onCommit: () => void }) {
  const gh = useGitHub();
  const { changes, dirty, openFile, revertFile, discardAllChanges, pr } = useWorkspace();

  const counts = changes.reduce(
    (acc, c) => {
      acc[c.changeType]++;
      return acc;
    },
    { created: 0, modified: 0, deleted: 0 } as Record<string, number>,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Changes ({changes.length})
        </span>
        {dirty && (
          <button type="button" className="text-xs text-muted hover:text-error" onClick={discardAllChanges}>
            Discard all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {changes.length === 0 ? (
          <div className="px-3 py-6 text-xs text-faint">
            No changes yet. Edit files directly, or ask the agent to implement a requirement.
          </div>
        ) : (
          <ul className="py-1">
            {changes.map((c) => {
              const mark = CHANGE_MARK[c.changeType];
              return (
                <li key={c.path} className="group flex items-center gap-2 px-3 py-1 hover:bg-elevated/50">
                  <span className={`mono w-3 text-center text-[11px] font-bold ${mark.color}`}>{mark.mark}</span>
                  <button
                    type="button"
                    className="mono min-w-0 flex-1 truncate text-left text-xs text-ink/80 hover:text-ink"
                    onClick={() => void openFile(c.path)}
                    title={c.path}
                  >
                    {c.path}
                  </button>
                  <button
                    type="button"
                    className="text-[11px] text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-warning"
                    onClick={() => revertFile(c.path)}
                  >
                    revert
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        {pr && (
          <Banner kind="success" className="mb-2">
            <div className="flex items-center justify-between gap-2">
              <span>PR #{pr.number} created</span>
              <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="underline">
                Open on GitHub ↗
              </a>
            </div>
          </Banner>
        )}
        {changes.length > 0 && (
          <div className="mb-2 flex gap-2 text-[11px] text-faint">
            <span className="text-success">+{counts.created} added</span>
            <span className="text-warning">~{counts.modified} modified</span>
            <span className="text-error">-{counts.deleted} deleted</span>
          </div>
        )}
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!dirty || !gh.canWrite}
          onClick={onCommit}
          title={!gh.canWrite ? 'Your token cannot push to this repository' : undefined}
        >
          Commit &amp; create Pull Request
        </button>
        {!gh.canWrite && dirty && (
          <p className="mt-1 text-[11px] text-warning">Read-only token — connect a token with write access to commit.</p>
        )}
      </div>
    </div>
  );
}
