import type {
  Implementation,
  Plan,
  RepositoryAnalysis,
  RepositoryContext,
} from '../../types';
import { uid } from '../../utils/id';
import { structuredCall, textCall, DEFAULT_MODEL } from './openaiClient';
import type { AICallOpts, AIProvider, ChangeSummary } from './types';
import {
  ANALYSIS_SCHEMA,
  IMPLEMENTATION_SCHEMA,
  PLAN_SCHEMA,
  REPO_QA_SYSTEM,
  SUMMARY_SCHEMA,
  SYSTEM_PROMPT,
  analyzePrompt,
  implementPrompt,
  planPrompt,
  repoQaPrompt,
  summarizeChangesPrompt,
} from './prompts';

interface RawPlan {
  summary: string;
  requirements: string[];
  steps: Array<{ title: string; description: string }>;
}

/** OpenAI-backed implementation of the shared, provider-agnostic AIProvider. */
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly model: string;
  private readonly apiKey: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
  }

  async analyzeRepository(ctx: RepositoryContext, opts: AICallOpts = {}): Promise<RepositoryAnalysis> {
    return structuredCall<RepositoryAnalysis>({
      apiKey: this.apiKey,
      model: this.model,
      system: SYSTEM_PROMPT,
      prompt: analyzePrompt(ctx),
      maxTokens: 4000,
      signal: opts.signal,
      tool: { name: 'submit_analysis', description: 'Submit your structured repository analysis.', input_schema: ANALYSIS_SCHEMA },
    });
  }

  async generatePlan(ctx: RepositoryContext, requirement: string, opts: AICallOpts = {}): Promise<Plan> {
    const raw = await structuredCall<RawPlan>({
      apiKey: this.apiKey,
      model: this.model,
      system: SYSTEM_PROMPT,
      prompt: planPrompt(ctx, requirement),
      maxTokens: 6000,
      signal: opts.signal,
      tool: { name: 'submit_plan', description: 'Submit the ordered implementation plan.', input_schema: PLAN_SCHEMA },
    });
    return {
      summary: raw.summary,
      requirements: raw.requirements ?? [],
      steps: (raw.steps ?? []).map((s) => ({ id: uid('step'), title: s.title, description: s.description })),
    };
  }

  async generateImplementation(
    ctx: RepositoryContext,
    plan: Plan,
    requirement: string,
    relevantFiles: Record<string, string>,
    opts: AICallOpts = {},
  ): Promise<Implementation> {
    const impl = await structuredCall<Implementation>({
      apiKey: this.apiKey,
      model: this.model,
      system: SYSTEM_PROMPT,
      prompt: implementPrompt(ctx, plan, requirement, relevantFiles),
      maxTokens: 16000,
      signal: opts.signal,
      tool: {
        name: 'submit_implementation',
        description: 'Submit the structured file operations that implement the plan.',
        input_schema: IMPLEMENTATION_SCHEMA,
      },
    });
    return { summary: impl.summary, operations: impl.operations ?? [], notes: impl.notes ?? [] };
  }

  async answerQuestion(ctx: RepositoryContext, question: string, opts: AICallOpts = {}): Promise<string> {
    return textCall({
      apiKey: this.apiKey,
      model: this.model,
      system: REPO_QA_SYSTEM,
      prompt: repoQaPrompt(ctx, question),
      maxTokens: 4000,
      signal: opts.signal,
      onDelta: opts.onDelta,
    });
  }

  async summarizeChanges(
    changes: Array<{ path: string; changeType: string }>,
    requirement: string,
    opts: AICallOpts = {},
  ): Promise<ChangeSummary> {
    return structuredCall<ChangeSummary>({
      apiKey: this.apiKey,
      model: this.model,
      system: SYSTEM_PROMPT,
      prompt: summarizeChangesPrompt(changes, requirement),
      maxTokens: 2000,
      signal: opts.signal,
      tool: { name: 'submit_summary', description: 'Submit the commit message and PR description.', input_schema: SUMMARY_SCHEMA },
    });
  }
}
