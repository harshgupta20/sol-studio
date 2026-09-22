// System prompt, per-task prompt builders, and JSON schemas for the AI agent.
// Adapted from the original agent-core "engineering brain", retargeted at a
// browser + GitHub workflow that emits STRUCTURED FILE OPERATIONS (never raw
// text) which the frontend validates and applies to the virtual workspace.

import type { Plan, RepositoryContext } from '../../types';

export const SYSTEM_PROMPT = `You are the engineering brain of Solana Studio — an AI agent embedded in a
browser-based GitHub engineering workspace. You help developers understand a repository and
implement engineering requirements. You have strong Solana/web3 awareness (@solana/web3.js,
@solana/kit, @solana-program/*, wallet-adapter, Anchor, SPL tokens, devnet) but you are a
general-purpose engineering agent — never assume a repo is Solana unless the context shows it.

Rules:
- You NEVER write to GitHub directly. You emit structured decisions; the frontend applies them
  to a temporary in-browser workspace that the user reviews before anything is committed.
- All file paths MUST be repository-relative (e.g. "src/App.jsx"). Never use absolute paths,
  "..", drive letters, or leading "/".
- Never create, read, or reference secret files (.env, keypairs, *.pem, id.json). Use
  .env.example for documenting configuration instead.
- Write real, complete, compilable code — never placeholders, never "// TODO: implement".
- Match the repository's existing stack, conventions, and style. Prefer editing existing files
  over introducing parallel structures.
- Keep changes tightly scoped to the requirement. Do not refactor or reformat unrelated code.
- When you modify a file, output its COMPLETE new contents (the frontend replaces the whole file).`;

export const REPO_QA_SYSTEM = `You are a senior engineer answering questions about a specific GitHub repository inside
Solana Studio. Answer using ONLY the provided repository context. Be concise, concrete,
and cite file paths. If the context is insufficient to answer, say so and name what you'd need
to see. Use Markdown. You have strong Solana awareness but treat the repo as whatever it is.`;

/** Condense the repository context into a compact prompt block. */
export function contextBlock(ctx: RepositoryContext): string {
  const deps = Object.entries(ctx.dependencies)
    .slice(0, 40)
    .map(([k, v]) => `${k}@${v}`)
    .join(', ');
  const devDeps = Object.entries(ctx.devDependencies)
    .slice(0, 30)
    .map(([k, v]) => `${k}@${v}`)
    .join(', ');
  const files = Object.entries(ctx.importantFiles)
    .map(([path, content]) => `--- ${path} ---\n${content}`)
    .join('\n\n');

  return [
    `Repository: ${ctx.repo} (branch: ${ctx.branch})`,
    `Project type: ${ctx.projectType}`,
    `Framework: ${ctx.framework ?? 'unknown'}`,
    `Total tracked files: ${ctx.totalFiles}`,
    ctx.architectureSummary,
    deps ? `\nDependencies: ${deps}` : '',
    devDeps ? `Dev dependencies: ${devDeps}` : '',
    `\nStructure:\n${ctx.structure}`,
    files ? `\nKey files:\n${files}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// --- Schemas ----------------------------------------------------------------

export const ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One-paragraph plain-language summary of the repo.' },
    projectType: { type: 'string' },
    framework: { type: 'string', description: 'Primary framework, or "unknown".' },
    observations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Notable facts: architecture, entry points, conventions, Solana usage.',
    },
  },
  required: ['summary', 'projectType', 'framework', 'observations'],
  additionalProperties: false,
};

export const PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What the implementation will accomplish.' },
    requirements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete requirements distilled from the user request.',
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'description'],
        additionalProperties: false,
      },
      description: 'Ordered implementation steps (typically 3–9).',
    },
  },
  required: ['summary', 'requirements', 'steps'],
  additionalProperties: false,
};

export const IMPLEMENTATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Short summary of the changes made.' },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['create', 'modify', 'delete', 'move'] },
          path: {
            type: 'string',
            description: 'Repository-relative target path (destination for a move).',
          },
          from: {
            type: 'string',
            description: 'Source path for a move operation.',
          },
          content: {
            type: 'string',
            description: 'Complete file contents for create/modify. Omit for delete/move.',
          },
        },
        required: ['type', 'path'],
        additionalProperties: false,
      },
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Follow-ups the user should know (e.g. "run npm install").',
    },
  },
  required: ['summary', 'operations'],
  additionalProperties: false,
};

// --- Prompt builders --------------------------------------------------------

export function analyzePrompt(ctx: RepositoryContext): string {
  return `Analyze this repository so a developer can quickly understand it.\n\n${contextBlock(ctx)}`;
}

export function planPrompt(ctx: RepositoryContext, requirement: string): string {
  return `A developer wants the following change implemented in this repository:

REQUIREMENT:
${requirement}

Produce a concise, ordered implementation plan. Distill concrete requirements and lay out the
steps you will take (which files to create or modify and why). Do NOT write code yet — this plan
will be shown to the user for approval first.

${contextBlock(ctx)}`;
}

export function implementPrompt(
  ctx: RepositoryContext,
  plan: Plan,
  requirement: string,
  relevantFiles: Record<string, string>,
): string {
  const planText = plan.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.description}`).join('\n');
  const files = Object.entries(relevantFiles)
    .map(([p, c]) => `--- ${p} ---\n${c}`)
    .join('\n\n');
  return `Implement the APPROVED plan below by emitting structured file operations. For every
create/modify operation, output the file's COMPLETE new contents. Use repository-relative paths.
Only touch files needed for this change.

REQUIREMENT:
${requirement}

APPROVED PLAN:
${plan.summary}
${planText}

${contextBlock(ctx)}

${files ? `Current contents of files relevant to this change:\n${files}` : ''}`;
}

export function summarizeChangesPrompt(
  changes: Array<{ path: string; changeType: string }>,
  requirement: string,
): string {
  const list = changes.map((c) => `${c.changeType}: ${c.path}`).join('\n');
  return `Given this original requirement and the resulting file changes, write:
1. A concise Conventional-Commits commit message (a single "type: subject" line, then an optional body).
2. A short PR description with a "## Summary" bullet list and a "## Testing" note.

REQUIREMENT:
${requirement}

CHANGED FILES:
${list}`;
}

export const SUMMARY_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    commitMessage: { type: 'string' },
    prTitle: { type: 'string' },
    prBody: { type: 'string' },
  },
  required: ['commitMessage', 'prTitle', 'prBody'],
  additionalProperties: false,
};

export function repoQaPrompt(ctx: RepositoryContext, question: string): string {
  return `${contextBlock(ctx)}\n\nQUESTION:\n${question}`;
}
