// The frontend Agent: a provider-agnostic orchestrator. It builds repository
// context, selects relevant files, and delegates the actual LLM calls to an
// AIProvider. It never touches GitHub or the workspace directly — callers apply
// the structured operations it returns.

import type {
  Implementation,
  Plan,
  RepositoryAnalysis,
  RepositoryContext,
  TreeEntry,
} from '../../types';
import { buildRepositoryContext } from '../../workspace/repositoryContext';
import { isContextIgnored } from '../../workspace/ignore';
import { normalizePath } from '../../utils/paths';
import type { AICallOpts, AIProvider, ChangeSummary } from '../ai/types';

export interface RepoReader {
  repoFullName: string;
  branch: string;
  tree: TreeEntry[];
  /** Read a repo file's current text (null if missing/binary). */
  readFile: (path: string) => Promise<string | null>;
}

const MAX_RELEVANT_FILES = 12;
const RELEVANT_FILE_CHARS = 8000;

export class Agent {
  private contextPromise: Promise<RepositoryContext> | null = null;
  private provider: AIProvider;

  constructor(
    provider: AIProvider,
    private readonly reader: RepoReader,
  ) {
    this.provider = provider;
  }

  /** Swap the AI provider (e.g. after the key/model changes) without losing the cached context. */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  get model(): string {
    return this.provider.model;
  }

  /** Build (and cache) the repository context sent to the model. */
  context(): Promise<RepositoryContext> {
    if (!this.contextPromise) {
      this.contextPromise = buildRepositoryContext({
        repo: this.reader.repoFullName,
        branch: this.reader.branch,
        tree: this.reader.tree,
        readFile: this.reader.readFile,
      });
    }
    return this.contextPromise;
  }

  async analyzeRepository(opts?: AICallOpts): Promise<RepositoryAnalysis> {
    return this.provider.analyzeRepository(await this.context(), opts);
  }

  async createPlan(requirement: string, opts?: AICallOpts): Promise<Plan> {
    return this.provider.generatePlan(await this.context(), requirement, opts);
  }

  async implementPlan(
    plan: Plan,
    requirement: string,
    opts?: AICallOpts,
  ): Promise<Implementation> {
    const ctx = await this.context();
    const relevant = await this.selectRelevantFiles(plan, requirement, ctx);
    return this.provider.generateImplementation(ctx, plan, requirement, relevant, opts);
  }

  async ask(question: string, opts?: AICallOpts): Promise<string> {
    return this.provider.answerQuestion(await this.context(), question, opts);
  }

  async summarizeChanges(
    changes: Array<{ path: string; changeType: string }>,
    requirement: string,
    opts?: AICallOpts,
  ): Promise<ChangeSummary> {
    return this.provider.summarizeChanges(changes, requirement, opts);
  }

  /**
   * Pick files most relevant to this change: any repo paths explicitly named in
   * the requirement or plan text, capped and size-limited. The important files
   * from context are already in the prompt, so we avoid duplicating them.
   */
  private async selectRelevantFiles(
    plan: Plan,
    requirement: string,
    ctx: RepositoryContext,
  ): Promise<Record<string, string>> {
    const blob = new Set(
      this.reader.tree.filter((e) => e.type === 'blob').map((e) => e.path),
    );
    const alreadyInContext = new Set(Object.keys(ctx.importantFiles).map(normalizePath));

    const haystack = [
      requirement,
      plan.summary,
      ...plan.requirements,
      ...plan.steps.flatMap((s) => [s.title, s.description]),
    ].join('\n');

    // Match path-like tokens (contain a slash or a known extension).
    const candidates = new Set<string>();
    const pathRe = /[\w./-]+\.[a-zA-Z0-9]+/g;
    for (const m of haystack.matchAll(pathRe)) {
      const p = normalizePath(m[0].replace(/^["'`(]+|["'`.,:)]+$/g, ''));
      if (blob.has(p) && !alreadyInContext.has(p) && !isContextIgnored(p)) {
        candidates.add(p);
      }
    }

    const out: Record<string, string> = {};
    let count = 0;
    for (const p of candidates) {
      if (count >= MAX_RELEVANT_FILES) break;
      const text = await this.reader.readFile(p).catch(() => null);
      if (text === null) continue;
      out[p] = text.slice(0, RELEVANT_FILE_CHARS);
      count++;
    }
    return out;
  }
}
