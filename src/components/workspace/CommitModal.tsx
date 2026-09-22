import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { useAI } from '../../state/AIContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Banner, CHANGE_MARK, Spinner } from '../ui';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'changes'
  );
}

export function CommitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ai = useAI();
  const { changes, run, branch, committing, commitError, pr, commitAndCreatePR, suggestSummary } =
    useWorkspace();

  const defaults = useMemo(() => {
    const seed = run.requirement || 'Update files';
    const subject = seed.length > 60 ? seed.slice(0, 57) + '…' : seed;
    const body =
      '## Summary\n' +
      changes.map((c) => `- ${c.changeType} \`${c.path}\``).join('\n') +
      '\n\n## Testing\n- Reviewed the generated diff in Solana Studio\n- Frontend validation passed';
    return {
      branchName: `agent/${slugify(seed)}`,
      commitMessage: subject,
      prTitle: subject,
      prBody: body,
    };
  }, [run.requirement, changes]);

  const [branchName, setBranchName] = useState(defaults.branchName);
  const [commitMessage, setCommitMessage] = useState(defaults.commitMessage);
  const [prTitle, setPrTitle] = useState(defaults.prTitle);
  const [prBody, setPrBody] = useState(defaults.prBody);
  const [draft, setDraft] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBranchName(defaults.branchName);
      setCommitMessage(defaults.commitMessage);
      setPrTitle(defaults.prTitle);
      setPrBody(defaults.prBody);
      setLocalError(null);
    }
  }, [open]);

  const suggest = async () => {
    setSuggesting(true);
    try {
      const s = await suggestSummary();
      if (s) {
        setCommitMessage(s.commitMessage);
        setPrTitle(s.prTitle);
        setPrBody(s.prBody);
      }
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    setLocalError(null);
    try {
      await commitAndCreatePR({ branchName, commitMessage, prTitle, prBody, draft });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create pull request.');
    }
  };

  const counts = changes.reduce(
    (acc, c) => ((acc[c.changeType] = (acc[c.changeType] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );

  return (
    <Modal open={open} onClose={onClose} wide title="Commit & create Pull Request">
      <div className="space-y-4 p-4">
        {pr ? (
          <div className="space-y-3 text-center">
            <div className="text-4xl">✅</div>
            <div className="text-sm font-semibold text-ink">Pull request created</div>
            <div className="text-sm text-muted">
              #{pr.number} · {pr.title}
            </div>
            <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex">
              Open Pull Request on GitHub ↗
            </a>
            <div>
              <button type="button" className="btn-ghost mt-2 text-xs" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-surface p-3 text-xs">
              <div>
                <div className="text-faint">Target branch</div>
                <div className="mono mt-0.5 text-ink">{branch}</div>
              </div>
              <div>
                <div className="text-faint">Changed files</div>
                <div className="mt-0.5 flex gap-2">
                  {(['created', 'modified', 'deleted'] as const).map((k) =>
                    counts[k] ? (
                      <span key={k} className={CHANGE_MARK[k].color}>
                        {counts[k]} {CHANGE_MARK[k].label}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
                Feature branch
              </label>
              <input className="input mono" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              <p className="mt-1 text-[11px] text-faint">
                A new branch is created off <span className="mono">{branch}</span>. The default
                branch is never modified.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Commit message
              </label>
              {ai.configured && (
                <button
                  type="button"
                  className="text-xs text-muted hover:text-sol"
                  disabled={suggesting}
                  onClick={() => void suggest()}
                >
                  {suggesting ? <><Spinner /> Suggesting…</> : '✨ Suggest with AI'}
                </button>
              )}
            </div>
            <textarea
              className="input min-h-[60px] resize-y font-mono text-xs"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
                PR title
              </label>
              <input className="input" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-faint">
                PR description
              </label>
              <textarea
                className="input min-h-[120px] resize-y font-mono text-xs"
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
              Create as draft PR
            </label>

            {(localError || commitError) && <Banner>{localError || commitError}</Banner>}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={committing}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={committing || !branchName.trim()}
                onClick={() => void submit()}
              >
                {committing ? (
                  <>
                    <Spinner /> Creating PR…
                  </>
                ) : (
                  'Commit & create PR'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
