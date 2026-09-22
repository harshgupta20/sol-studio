// =============================================================================
// Domain types for Solana Studio — a frontend-only GitHub engineering
// workspace. These mirror the shapes we get from the GitHub REST API and the
// AI provider, plus the browser-local workspace model. No backend involved.
// =============================================================================

// --- GitHub ------------------------------------------------------------------

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}

export interface Repo {
  id: number;
  name: string;
  fullName: string; // owner/name
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  updatedAt: string;
  htmlUrl: string;
  /** True when the token can push (needed to create branches / commits / PRs). */
  canPush: boolean;
}

export interface Branch {
  name: string;
  commitSha: string;
  protected: boolean;
}

/** A single entry in a recursive git tree. */
export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface PullRequest {
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  head: string;
  base: string;
  draft: boolean;
}

// --- Workspace (browser-local) ----------------------------------------------

export type ChangeType = 'created' | 'modified' | 'deleted';

/**
 * One file in the virtual workspace.
 * - `base`   : content as it exists on the loaded branch (null = file is new / not in repo).
 * - `content`: current working content (null = file is deleted in the workspace).
 * A file is "dirty" when `content !== base` (accounting for create/delete).
 */
export interface FileEntry {
  path: string;
  base: string | null;
  content: string | null;
  /** Blob SHA on the branch, when known — lets us skip re-reads. */
  baseSha?: string;
  /** Origin: existed in the repo, or created in the workspace. */
  origin: 'repo' | 'new';
  /** True once `base`/`content` have been fetched (tree entries start unloaded). */
  loaded: boolean;
  /** True if the file is binary / too large and was not loaded as text. */
  binary?: boolean;
}

export interface WorkspaceChange {
  path: string;
  changeType: ChangeType;
  /** For a rename detected as delete+create, the counterpart path. */
  renamedFrom?: string;
}

// --- AI / Agent --------------------------------------------------------------

export interface PlanStep {
  id: string;
  title: string;
  description: string;
}

export interface Plan {
  summary: string;
  requirements: string[];
  steps: PlanStep[];
}

export interface RepositoryAnalysis {
  summary: string;
  projectType: string;
  framework: string | null;
  observations: string[];
}

export type OperationType = 'create' | 'modify' | 'delete' | 'move';

/**
 * A structured file operation emitted by the AI. Never applied verbatim — every
 * operation is validated (path safety, size, existence) before it touches the
 * virtual workspace.
 */
export interface FileOperation {
  type: OperationType;
  /** Target path for create/modify/delete; destination for move. */
  path: string;
  /** Full file content for create/modify. */
  content?: string;
  /** Source path for a move. */
  from?: string;
}

export interface Implementation {
  summary: string;
  operations: FileOperation[];
  notes?: string[];
}

/** The result of validating a single operation against the workspace. */
export interface ValidatedOperation {
  operation: FileOperation;
  ok: boolean;
  reason?: string;
}

// --- Repository context sent to the AI --------------------------------------

export interface RepositoryContext {
  repo: string;
  branch: string;
  projectType: string;
  framework: string | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  structure: string; // condensed tree
  importantFiles: Record<string, string>; // path -> (possibly truncated) content
  architectureSummary: string;
  totalFiles: number;
}

// --- Agent run lifecycle -----------------------------------------------------

export type AgentPhase =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'awaiting_approval'
  | 'implementing'
  | 'applying'
  | 'ready' // changes applied to workspace, awaiting review/commit
  | 'error';

export type ActivityStatus = 'info' | 'running' | 'success' | 'error' | 'warning';

export interface ActivityItem {
  id: string;
  ts: number;
  status: ActivityStatus;
  message: string;
  detail?: string;
}

// --- AI provider configuration ----------------------------------------------

export type AIProviderId = 'anthropic' | 'openai';

export interface AIConfig {
  provider: AIProviderId;
  apiKey: string;
  model: string;
}
