import { useEffect, useMemo, useState } from 'react';
import { useGitHub } from '../../state/GitHubContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { GitHubError, listBranches, listRepositories } from '../../services/github';
import type { Branch, Repo } from '../../types';
import { Banner, NetworkBadge, Spinner } from '../ui';

export function Repositories() {
  const gh = useGitHub();
  const { loadRepository, status: wsStatus, repo: loadedRepo, loadError } = useWorkspace();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Repo | null>(null);

  useEffect(() => {
    if (!gh.client) return;
    setLoading(true);
    listRepositories(gh.client)
      .then((list) => {
        setRepos(list);
        setError(null);
      })
      .catch((err) => setError(err instanceof GitHubError ? err.message : 'Failed to load repositories.'))
      .finally(() => setLoading(false));
  }, [gh.client]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) => r.fullName.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
    );
  }, [repos, query]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-ink">Repositories</h1>
          <p className="text-sm text-muted">Pick a repository and branch to open in the workspace.</p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Filter repositories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <Banner className="mb-4">{error}</Banner>}
      {loadError && <Banner className="mb-4">{loadError}</Banner>}

      {loading ? (
        <div className="py-24 text-center text-sm text-faint">
          <Spinner className="mr-2" /> Loading repositories…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center text-sm text-muted">No repositories match.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <RepoCard
              key={r.id}
              repo={r}
              selected={selected?.id === r.id}
              loading={wsStatus === 'loading' && loadedRepo?.id === r.id}
              onSelect={() => setSelected((cur) => (cur?.id === r.id ? null : r))}
              onOpen={(branch) => void loadRepository(r, branch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({
  repo,
  selected,
  loading,
  onSelect,
  onOpen,
}: {
  repo: Repo;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
  onOpen: (branch: string) => void;
}) {
  const gh = useGitHub();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branch, setBranch] = useState(repo.defaultBranch);
  const [branchErr, setBranchErr] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (!selected || branches || !gh.client) return;
    setLoadingBranches(true);
    listBranches(gh.client, repo.owner, repo.name)
      .then((list) => {
        setBranches(list.length ? list : [{ name: repo.defaultBranch, commitSha: '', protected: false }]);
        setBranchErr(null);
      })
      .catch((err) => setBranchErr(err instanceof GitHubError ? err.message : 'Failed to load branches.'))
      .finally(() => setLoadingBranches(false));
  }, [selected, branches, gh.client, repo]);

  return (
    <div className={`card p-4 transition-colors ${selected ? 'border-borderStrong' : ''}`}>
      <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={onSelect}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink">{repo.fullName}</h3>
            {repo.private && (
              <span className="badge border-faint/30 bg-faint/10 text-[10px] text-muted">private</span>
            )}
          </div>
          {repo.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{repo.description}</p>}
        </div>
        {repo.language && <NetworkBadge network={repo.language} />}
      </button>

      {selected && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {branchErr && <Banner>{branchErr}</Banner>}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-faint">Branch</span>
            <select
              className="input flex-1 py-1.5 text-xs"
              value={branch}
              disabled={loadingBranches}
              onChange={(e) => setBranch(e.target.value)}
            >
              {(branches ?? [{ name: repo.defaultBranch, commitSha: '', protected: false }]).map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.name === repo.defaultBranch ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={loading || loadingBranches}
            onClick={() => onOpen(branch)}
          >
            {loading ? (
              <>
                <Spinner /> Loading workspace…
              </>
            ) : (
              'Open workspace →'
            )}
          </button>
          {!gh.canWrite && (
            <p className="text-[11px] text-warning">
              Read-only token: you can browse and use the agent, but committing/PRs need write access.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
