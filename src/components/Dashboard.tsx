import { useAI } from '../state/AIContext';
import { useGitHub } from '../state/GitHubContext';
import { useWorkspace } from '../state/WorkspaceContext';
import { Dot, SectionLabel, StatusGlyph } from './ui';
import { ProviderIcon } from './ai/ProviderIcon';

export function Dashboard({
  onBrowseRepos,
  onOpenAISettings,
}: {
  onBrowseRepos: () => void;
  onOpenAISettings: () => void;
}) {
  const gh = useGitHub();
  const ai = useAI();
  const { repo, branch } = useWorkspace();

  const steps = [
    { done: gh.connected, label: 'Connect GitHub', hint: gh.user ? `Signed in as ${gh.user.login}` : 'Paste a token' },
    { done: ai.configured, label: 'Add your AI API key', hint: ai.configured ? `Using ${ai.model}` : 'Bring your own Claude key' },
    { done: Boolean(repo), label: 'Open a repository', hint: repo ? `${repo.fullName} @ ${branch}` : 'Pick a repo + branch' },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink">Welcome to your engineering workspace</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Understand a repository, describe an engineering requirement, review an AI-generated plan,
          apply changes to a browser-local workspace, edit anything by hand, then commit and open a
          pull request — all without a backend. GitHub is the source of truth; you control every write.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <SectionLabel>GitHub</SectionLabel>
          <div className="flex items-center gap-2 text-sm text-ink">
            <Dot online={gh.connected} />
            {gh.connected ? gh.user?.login : 'Not connected'}
          </div>
          <p className="mt-1 text-xs text-faint">
            {gh.connected
              ? gh.canWrite
                ? 'Write access — commits & PRs enabled'
                : 'Read-only token'
              : 'Connect to browse repositories'}
          </p>
        </div>

        <button type="button" onClick={onOpenAISettings} className="card p-4 text-left transition-colors hover:border-borderStrong">
          <SectionLabel>AI provider</SectionLabel>
          <div className="flex items-center gap-2 text-sm text-ink">
            <ProviderIcon provider={ai.provider} size={16} className={ai.configured ? '' : 'opacity-45'} />
            {ai.configured ? ai.model : 'No key set'}
          </div>
          <p className="mt-1 text-xs text-faint">
            {ai.configured ? 'Ready — click to change key/model' : 'Click to add your Claude or OpenAI API key'}
          </p>
        </button>

        <button type="button" onClick={onBrowseRepos} className="card p-4 text-left transition-colors hover:border-borderStrong">
          <SectionLabel>Repository</SectionLabel>
          <div className="flex items-center gap-2 text-sm text-ink">
            <Dot online={Boolean(repo)} />
            {repo ? repo.name : 'None loaded'}
          </div>
          <p className="mt-1 text-xs text-faint">
            {repo ? `Branch: ${branch}` : 'Click to browse your repositories'}
          </p>
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <SectionLabel>Get started</SectionLabel>
          <ol className="mt-2 space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <StatusGlyph kind={s.done ? 'success' : 'pending'} className="mt-0.5" />
                <div>
                  <div className="text-sm text-ink">{s.label}</div>
                  <div className="text-xs text-faint">{s.hint}</div>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn-primary mt-4 w-full" onClick={onBrowseRepos}>
            Browse repositories →
          </button>
        </div>

        <div className="card p-5">
          <SectionLabel>How the agent works</SectionLabel>
          <ol className="mt-2 space-y-1.5 text-sm text-muted">
            {[
              'The agent reads a curated slice of the repo to understand it',
              'You describe a requirement; it proposes a plan you approve',
              'It generates structured file changes into a browser workspace',
              'You review the full diff and edit anything by hand',
              'It creates a feature branch, commits, and opens a PR on GitHub',
            ].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mono text-faint">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-md border border-border bg-surface p-3 text-[11px] leading-relaxed text-faint">
            Especially handy for Solana projects (wallet-adapter, @solana/web3.js, Anchor, SPL, devnet),
            but works as a general GitHub engineering agent for any repository.
          </p>
        </div>
      </div>
    </div>
  );
}
