// The workspace store: repository loading, the virtual filesystem, editor tabs,
// the agent run lifecycle, manual editing, and the commit/PR flow. GitHub is the
// source of truth; everything here is browser-local until the user commits.

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
import type {
  ActivityItem,
  ActivityStatus,
  AgentPhase,
  Implementation,
  Plan,
  PullRequest,
  Repo,
  RepositoryAnalysis,
  WorkspaceChange,
} from '../types';
import { useGitHub } from './GitHubContext';
import { useAI } from './AIContext';
import { AIError, createProvider } from '../services/ai';
import { Agent, applyOperations, validateOperations, type RepoReader } from '../services/agent';
import {
  GitHubError,
  branchExists,
  commitChanges,
  createBranch,
  createPullRequest,
  getBranchHeadSha,
  getFileText,
  getTree,
} from '../services/github';
import {
  commitPayload,
  createWorkspace,
  getChanges,
  getEntry,
  hasChanges as wsHasChanges,
  markDeleted,
  putBaseline,
  revert as wsRevert,
  setContent,
  type WorkspaceData,
} from '../workspace/virtualWorkspace';
import { uid } from '../utils/id';
import { normalizePath } from '../utils/paths';

interface FetchResult {
  text: string | null;
  binary: boolean;
  missing: boolean;
}

interface QAMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

interface RunState {
  phase: AgentPhase;
  analysis: RepositoryAnalysis | null;
  plan: Plan | null;
  implementation: Implementation | null;
  requirement: string;
  activity: ActivityItem[];
  applyResult: { applied: string[]; skipped: Array<{ path: string; reason: string }> } | null;
  error: string | null;
}

const initialRun: RunState = {
  phase: 'idle',
  analysis: null,
  plan: null,
  implementation: null,
  requirement: '',
  activity: [],
  applyResult: null,
  error: null,
};

export interface CommitInput {
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  draft: boolean;
}

interface WorkspaceState {
  repo: Repo | null;
  branch: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  truncated: boolean;

  ws: WorkspaceData | null;
  changes: WorkspaceChange[];
  dirty: boolean;

  tabs: string[];
  activeTab: string | null;
  openingFile: string | null;

  run: RunState;
  qa: QAMessage[];
  qaStreaming: string | null;
  qaBusy: boolean;

  committing: boolean;
  commitError: string | null;
  pr: PullRequest | null;

  // actions
  loadRepository: (repo: Repo, branch: string) => Promise<void>;
  closeRepository: () => void;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  editFile: (path: string, content: string) => void;
  revertFile: (path: string) => void;
  deleteFile: (path: string) => void;

  analyzeRepository: () => Promise<void>;
  submitRequirement: (requirement: string) => Promise<void>;
  approvePlan: () => Promise<void>;
  rejectPlan: () => void;
  askQuestion: (question: string) => Promise<void>;
  resetRun: () => void;

  discardAllChanges: () => void;
  suggestSummary: () => Promise<{ commitMessage: string; prTitle: string; prBody: string } | null>;
  commitAndCreatePR: (input: CommitInput) => Promise<PullRequest>;
  clearCommitState: () => void;
}

const Ctx = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const gh = useGitHub();
  const ai = useAI();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkspaceState['status']>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [ws, setWs] = useState<WorkspaceData | null>(null);

  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTabState] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const [run, setRun] = useState<RunState>(initialRun);
  const [qa, setQa] = useState<QAMessage[]>([]);
  const [qaStreaming, setQaStreaming] = useState<string | null>(null);
  const [qaBusy, setQaBusy] = useState(false);

  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [pr, setPr] = useState<PullRequest | null>(null);

  // Refs kept in sync so closures (readFile, agent) always see current values.
  const clientRef = useRef(gh.client);
  const repoRef = useRef<Repo | null>(null);
  const branchRef = useRef<string | null>(null);
  const fileCacheRef = useRef<Map<string, FetchResult>>(new Map());
  const readerRef = useRef<RepoReader | null>(null);
  const agentRef = useRef<Agent | null>(null);
  // Mirror the latest ws/run so async callbacks read current values.
  const wsRef = useRef<WorkspaceData | null>(null);
  const runRef = useRef<RunState>(run);

  useEffect(() => {
    clientRef.current = gh.client;
  }, [gh.client]);

  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Keep the agent's provider current as the AI config changes.
  useEffect(() => {
    if (!readerRef.current) return;
    if (!ai.config) {
      agentRef.current = null;
      return;
    }
    const provider = createProvider(ai.config);
    if (agentRef.current) agentRef.current.setProvider(provider);
    else agentRef.current = new Agent(provider, readerRef.current);
  }, [ai.config]);

  // --- file fetching (cached) ------------------------------------------------

  const fetchFile = useCallback(async (path: string): Promise<FetchResult> => {
    const p = normalizePath(path);
    const cached = fileCacheRef.current.get(p);
    if (cached) return cached;
    const client = clientRef.current;
    const r = repoRef.current;
    const b = branchRef.current;
    if (!client || !r || !b) return { text: null, binary: false, missing: true };
    let result: FetchResult;
    try {
      const res = await getFileText(client, r.owner, r.name, p, b);
      result = { text: res.text, binary: res.binary, missing: false };
    } catch (err) {
      if (err instanceof GitHubError && err.code === 'not_found') {
        result = { text: null, binary: false, missing: true };
      } else {
        throw err;
      }
    }
    fileCacheRef.current.set(p, result);
    return result;
  }, []);

  // --- repository load --------------------------------------------------------

  const loadRepository = useCallback(
    async (nextRepo: Repo, nextBranch: string) => {
      const client = clientRef.current;
      if (!client) {
        setLoadError('Connect GitHub first.');
        return;
      }
      setStatus('loading');
      setLoadError(null);
      setRepo(nextRepo);
      setBranch(nextBranch);
      repoRef.current = nextRepo;
      branchRef.current = nextBranch;
      fileCacheRef.current = new Map();
      setTabs([]);
      setActiveTabState(null);
      setRun(initialRun);
      setQa([]);
      setPr(null);
      setCommitError(null);
      agentRef.current = null;
      readerRef.current = null;

      try {
        const headSha = await getBranchHeadSha(client, nextRepo.owner, nextRepo.name, nextBranch);
        const tree = await getTree(client, nextRepo.owner, nextRepo.name, headSha);
        const workspace = createWorkspace(tree.entries, tree.truncated);
        setWs(workspace);
        setTruncated(tree.truncated);

        const reader: RepoReader = {
          repoFullName: nextRepo.fullName,
          branch: nextBranch,
          tree: tree.entries,
          readFile: (p) => fetchFile(p).then((r) => r.text),
        };
        readerRef.current = reader;
        if (ai.config) agentRef.current = new Agent(createProvider(ai.config), reader);

        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setLoadError(errMsg(err, 'Failed to load repository.'));
      }
    },
    [ai.config, fetchFile],
  );

  const closeRepository = useCallback(() => {
    setRepo(null);
    setBranch(null);
    setWs(null);
    setStatus('idle');
    setTabs([]);
    setActiveTabState(null);
    setRun(initialRun);
    setQa([]);
    setPr(null);
    repoRef.current = null;
    branchRef.current = null;
    readerRef.current = null;
    agentRef.current = null;
    fileCacheRef.current = new Map();
  }, []);

  // --- editor tabs ------------------------------------------------------------

  const openFile = useCallback(
    async (path: string) => {
      const p = normalizePath(path);
      setTabs((prev) => (prev.includes(p) ? prev : [...prev, p]));
      setActiveTabState(p);

      const existing = wsRef.current && getEntry(wsRef.current, p);
      if (existing?.loaded) return;

      setOpeningFile(p);
      try {
        const res = await fetchFile(p);
        // A tree file that 404s (moved/removed upstream) opens as empty rather
        // than being mis-flagged as a workspace deletion.
        const base = res.missing ? '' : res.text;
        setWs((current) =>
          current ? putBaseline(current, p, { base, binary: res.binary }) : current,
        );
      } finally {
        setOpeningFile((cur) => (cur === p ? null : cur));
      }
    },
    [fetchFile],
  );

  const closeTab = useCallback((path: string) => {
    const p = normalizePath(path);
    setTabs((prev) => {
      const next = prev.filter((t) => t !== p);
      setActiveTabState((cur) => (cur === p ? (next[next.length - 1] ?? null) : cur));
      return next;
    });
  }, []);

  const setActiveTab = useCallback((path: string) => setActiveTabState(normalizePath(path)), []);

  const editFile = useCallback((path: string, content: string) => {
    setWs((current) => (current ? setContent(current, normalizePath(path), content) : current));
  }, []);

  const revertFile = useCallback((path: string) => {
    setWs((current) => (current ? wsRevert(current, normalizePath(path)) : current));
  }, []);

  const deleteFile = useCallback(
    (path: string) => {
      const p = normalizePath(path);
      // Ensure baseline is loaded so the deletion diff can show old content.
      void fetchFile(p).then((res) =>
        setWs((current) =>
          current
            ? markDeleted(putBaseline(current, p, { base: res.text, binary: res.binary }), p)
            : current,
        ),
      );
    },
    [fetchFile],
  );

  // --- agent run helpers ------------------------------------------------------

  const pushActivity = useCallback(
    (status: ActivityStatus, message: string, detail?: string) => {
      const item: ActivityItem = { id: uid('act'), ts: Date.now(), status, message, detail };
      setRun((r) => ({ ...r, activity: [...r.activity, item] }));
    },
    [],
  );

  const ensureAgent = useCallback((): Agent => {
    if (!ai.config) throw new AIError('Add your AI API key in AI Settings first.', 'unauthorized');
    if (!readerRef.current) throw new Error('Load a repository first.');
    if (!agentRef.current) agentRef.current = new Agent(createProvider(ai.config), readerRef.current);
    else agentRef.current.setProvider(createProvider(ai.config));
    return agentRef.current;
  }, [ai.config]);

  const analyzeRepository = useCallback(async () => {
    let agent: Agent;
    try {
      agent = ensureAgent();
    } catch (err) {
      setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'AI not configured.') }));
      return;
    }
    setRun((r) => ({ ...r, phase: 'analyzing', error: null }));
    pushActivity('running', 'Analyzing repository…');
    try {
      const analysis = await agent.analyzeRepository();
      setRun((r) => ({ ...r, phase: 'idle', analysis }));
      pushActivity('success', 'Repository understood', analysis.summary);
    } catch (err) {
      setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'Analysis failed.') }));
      pushActivity('error', 'Analysis failed', errMsg(err, ''));
    }
  }, [ensureAgent, pushActivity]);

  const submitRequirement = useCallback(
    async (requirement: string) => {
      const text = requirement.trim();
      if (!text) return;
      let agent: Agent;
      try {
        agent = ensureAgent();
      } catch (err) {
        setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'AI not configured.') }));
        return;
      }
      setRun((r) => ({
        ...r,
        phase: 'planning',
        requirement: text,
        plan: null,
        implementation: null,
        applyResult: null,
        error: null,
      }));
      pushActivity('running', 'Generating implementation plan…', text);
      try {
        const plan = await agent.createPlan(text);
        setRun((r) => ({ ...r, phase: 'awaiting_approval', plan }));
        pushActivity('success', 'Plan ready — awaiting approval', plan.summary);
      } catch (err) {
        setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'Planning failed.') }));
        pushActivity('error', 'Planning failed', errMsg(err, ''));
      }
    },
    [ensureAgent, pushActivity],
  );

  const approvePlan = useCallback(async () => {
    const currentRun = runRef.current;
    if (!currentRun.plan) return;
    let agent: Agent;
    try {
      agent = ensureAgent();
    } catch (err) {
      setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'AI not configured.') }));
      return;
    }
    setRun((r) => ({ ...r, phase: 'implementing', error: null }));
    pushActivity('running', 'Implementing approved plan…');
    try {
      const implementation: Implementation = await agent.implementPlan(
        currentRun.plan,
        currentRun.requirement,
      );
      setRun((r) => ({ ...r, phase: 'applying', implementation }));
      pushActivity('success', 'Changes generated', implementation.summary);

      // Validate + apply to the virtual workspace.
      const base = wsRef.current;
      if (!base) throw new Error('Workspace not loaded.');
      const validated = validateOperations(implementation.operations, base);
      const rejected = validated.filter((v) => !v.ok);
      const result = await applyOperations(base, validated, (p) =>
        fetchFile(p).then((r) => r.text),
      );
      setWs(result.ws);
      const skipped = [
        ...rejected.map((v) => ({ path: v.operation.path, reason: v.reason ?? 'invalid' })),
        ...result.skipped,
      ];
      setRun((r) => ({
        ...r,
        phase: 'ready',
        applyResult: { applied: result.applied, skipped },
      }));
      pushActivity(
        skipped.length ? 'warning' : 'success',
        `Applied ${result.applied.length} change(s) to the workspace` +
          (skipped.length ? `, skipped ${skipped.length}` : ''),
        skipped.length ? skipped.map((s) => `${s.path}: ${s.reason}`).join('\n') : undefined,
      );
    } catch (err) {
      setRun((r) => ({ ...r, phase: 'error', error: errMsg(err, 'Implementation failed.') }));
      pushActivity('error', 'Implementation failed', errMsg(err, ''));
    }
  }, [ensureAgent, pushActivity, fetchFile]);

  const rejectPlan = useCallback(() => {
    setRun((r) => ({ ...r, phase: 'idle', plan: null }));
    pushActivity('info', 'Plan rejected — refine your requirement and try again.');
  }, [pushActivity]);

  const askQuestion = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text) return;
      let agent: Agent;
      try {
        agent = ensureAgent();
      } catch (err) {
        setQa((m) => [...m, { id: uid('qa'), role: 'agent', content: errMsg(err, 'AI not configured.') }]);
        return;
      }
      setQa((m) => [...m, { id: uid('qa'), role: 'user', content: text }]);
      setQaBusy(true);
      setQaStreaming('');
      try {
        const answer = await agent.ask(text, { onDelta: (d) => setQaStreaming((s) => (s ?? '') + d) });
        setQa((m) => [...m, { id: uid('qa'), role: 'agent', content: answer }]);
      } catch (err) {
        setQa((m) => [...m, { id: uid('qa'), role: 'agent', content: errMsg(err, 'Could not answer that.') }]);
      } finally {
        setQaBusy(false);
        setQaStreaming(null);
      }
    },
    [ensureAgent],
  );

  const resetRun = useCallback(() => setRun((r) => ({ ...initialRun, analysis: r.analysis })), []);

  // --- changes + commit -------------------------------------------------------

  const changes = useMemo(() => (ws ? getChanges(ws) : []), [ws]);
  const dirty = useMemo(() => (ws ? wsHasChanges(ws) : false), [ws]);

  const discardAllChanges = useCallback(() => {
    setWs((current) => {
      if (!current) return current;
      let next = current;
      for (const c of getChanges(current)) next = wsRevert(next, c.path);
      return next;
    });
    setRun((r) => ({ ...r, implementation: null, applyResult: null }));
    setPr(null);
  }, []);

  const suggestSummary = useCallback(async () => {
    if (!ai.config || !wsRef.current) return null;
    const list = getChanges(wsRef.current).map((c) => ({ path: c.path, changeType: c.changeType }));
    if (!list.length) return null;
    try {
      const agent = ensureAgent();
      return await agent.summarizeChanges(list, runRef.current.requirement || 'Update files');
    } catch {
      return null;
    }
  }, [ai.config, ensureAgent]);

  const commitAndCreatePR = useCallback(
    async (input: CommitInput): Promise<PullRequest> => {
      const client = clientRef.current;
      const r = repoRef.current;
      const b = branchRef.current;
      const current = wsRef.current;
      if (!client || !r || !b || !current) throw new Error('Workspace not ready.');
      if (!gh.canWrite) throw new GitHubError('Your token cannot push to this repo.', 403, 'forbidden');

      const featureBranch = input.branchName.trim();
      if (!featureBranch) throw new Error('Branch name is required.');
      if (featureBranch === b) throw new Error('Refusing to commit directly to the loaded branch.');

      const { writes, deletes } = commitPayload(current);
      if (!writes.length && !deletes.length) throw new Error('There are no changes to commit.');

      setCommitting(true);
      setCommitError(null);
      try {
        // Resolve the base commit: reuse the feature branch if it exists, else
        // branch off the loaded branch's head.
        let baseSha: string;
        const exists = await branchExists(client, r.owner, r.name, featureBranch);
        if (exists) {
          baseSha = await getBranchHeadSha(client, r.owner, r.name, featureBranch);
        } else {
          baseSha = await getBranchHeadSha(client, r.owner, r.name, b);
          await createBranch(client, r.owner, r.name, featureBranch, baseSha);
        }

        await commitChanges(client, {
          owner: r.owner,
          repo: r.name,
          branch: featureBranch,
          baseSha,
          message: input.commitMessage.trim() || 'Update via Solana Studio',
          writes,
          deletes,
        });

        const pullRequest = await createPullRequest(client, {
          owner: r.owner,
          repo: r.name,
          title: input.prTitle.trim() || input.commitMessage.trim() || 'Changes from Solana Studio',
          body: input.prBody,
          head: featureBranch,
          base: b,
          draft: input.draft,
        });
        setPr(pullRequest);
        pushActivity('success', `Pull request #${pullRequest.number} created`, pullRequest.htmlUrl);
        return pullRequest;
      } catch (err) {
        const message = errMsg(err, 'Failed to create the pull request.');
        setCommitError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setCommitting(false);
      }
    },
    [gh.canWrite, pushActivity],
  );

  const clearCommitState = useCallback(() => {
    setPr(null);
    setCommitError(null);
  }, []);

  const value = useMemo<WorkspaceState>(
    () => ({
      repo,
      branch,
      status,
      loadError,
      truncated,
      ws,
      changes,
      dirty,
      tabs,
      activeTab,
      openingFile,
      run,
      qa,
      qaStreaming,
      qaBusy,
      committing,
      commitError,
      pr,
      loadRepository,
      closeRepository,
      openFile,
      closeTab,
      setActiveTab,
      editFile,
      revertFile,
      deleteFile,
      analyzeRepository,
      submitRequirement,
      approvePlan,
      rejectPlan,
      askQuestion,
      resetRun,
      discardAllChanges,
      suggestSummary,
      commitAndCreatePR,
      clearCommitState,
    }),
    [
      repo, branch, status, loadError, truncated, ws, changes, dirty, tabs, activeTab,
      openingFile, run, qa, qaStreaming, qaBusy, committing, commitError, pr,
      loadRepository, closeRepository, openFile, closeTab, setActiveTab, editFile,
      revertFile, deleteFile, analyzeRepository, submitRequirement, approvePlan,
      rejectPlan, askQuestion, resetRun, discardAllChanges, suggestSummary,
      commitAndCreatePR, clearCommitState,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof AIError || err instanceof GitHubError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
