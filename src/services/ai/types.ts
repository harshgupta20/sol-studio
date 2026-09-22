// Provider-agnostic AI surface. Adding a new provider (OpenAI, local, …) means
// implementing this interface — the agent never talks to a vendor SDK directly.

import type {
  Implementation,
  Plan,
  RepositoryAnalysis,
  RepositoryContext,
} from '../../types';

export interface AICallOpts {
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

export interface ChangeSummary {
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

export interface AIProvider {
  readonly id: string;
  readonly model: string;

  analyzeRepository(ctx: RepositoryContext, opts?: AICallOpts): Promise<RepositoryAnalysis>;

  generatePlan(
    ctx: RepositoryContext,
    requirement: string,
    opts?: AICallOpts,
  ): Promise<Plan>;

  generateImplementation(
    ctx: RepositoryContext,
    plan: Plan,
    requirement: string,
    relevantFiles: Record<string, string>,
    opts?: AICallOpts,
  ): Promise<Implementation>;

  answerQuestion(
    ctx: RepositoryContext,
    question: string,
    opts?: AICallOpts,
  ): Promise<string>;

  summarizeChanges(
    changes: Array<{ path: string; changeType: string }>,
    requirement: string,
    opts?: AICallOpts,
  ): Promise<ChangeSummary>;
}
