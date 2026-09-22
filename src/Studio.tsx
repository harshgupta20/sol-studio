import { useEffect, useState } from 'react';
import { AppShell, type View } from './components/AppShell';
import { ConnectGitHub } from './components/github/ConnectGitHub';
import { Repositories } from './components/github/Repositories';
import { Dashboard } from './components/Dashboard';
import { AISettingsModal } from './components/ai/AISettingsModal';
import { Workspace } from './components/workspace/Workspace';
import { useGitHub } from './state/GitHubContext';
import { useWorkspace } from './state/WorkspaceContext';

export default function Studio() {
  const gh = useGitHub();
  const { repo, status } = useWorkspace();
  const [view, setView] = useState<View>('dashboard');
  const [aiOpen, setAiOpen] = useState(false);

  // Once a repository finishes loading, jump into the workspace.
  useEffect(() => {
    if (repo && status === 'ready') setView('workspace');
  }, [repo, status]);

  if (!gh.connected) {
    return <ConnectGitHub onOpenAISettings={() => setAiOpen(true)} aiOpen={aiOpen} onCloseAI={() => setAiOpen(false)} />;
  }

  return (
    <>
      <AppShell view={view} onNavigate={setView} onOpenAISettings={() => setAiOpen(true)}>
        {view === 'dashboard' && (
          <div className="h-full overflow-auto">
            <Dashboard onBrowseRepos={() => setView('repositories')} onOpenAISettings={() => setAiOpen(true)} />
          </div>
        )}
        {view === 'repositories' && (
          <div className="h-full overflow-auto">
            <Repositories />
          </div>
        )}
        {view === 'workspace' &&
          (repo ? (
            <Workspace onOpenAISettings={() => setAiOpen(true)} />
          ) : (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center text-sm text-faint">
              No repository loaded.{' '}
              <button className="text-sol hover:underline" onClick={() => setView('repositories')}>
                Choose one →
              </button>
            </div>
          ))}
      </AppShell>
      <AISettingsModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
