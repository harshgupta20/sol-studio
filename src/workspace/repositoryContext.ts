// Builds the compact, relevant context we hand to the AI. We deliberately do NOT
// send the whole repository — we detect the project type, read a curated set of
// important files (within a byte budget), and summarize the structure.

import type { RepositoryContext, TreeEntry } from '../types';
import { normalizePath } from '../utils/paths';
import { isContextIgnored } from './ignore';

export interface BuildContextInput {
  repo: string;
  branch: string;
  tree: TreeEntry[];
  /** Reads a repo-relative file's text (null if missing/binary). */
  readFile: (path: string) => Promise<string | null>;
}

const PER_FILE_CHARS = 6000;
const TOTAL_CONTEXT_CHARS = 70000;

const SOLANA_DEP_HINTS = [
  '@solana/web3.js',
  '@solana/kit',
  '@solana/wallet-adapter',
  '@solana-program/',
  '@coral-xyz/anchor',
  '@project-serum/anchor',
  '@metaplex-foundation/',
  'spl-token',
  '@solana/spl-token',
];

function mergeDeps(pkg: Record<string, unknown> | null, key: string): Record<string, string> {
  const v = pkg?.[key];
  return v && typeof v === 'object' ? (v as Record<string, string>) : {};
}

function detectFrameworkAndType(
  pkg: Record<string, unknown> | null,
  paths: string[],
  deps: Record<string, string>,
): { framework: string | null; projectType: string } {
  const has = (name: string) => name in deps;
  const anyDep = (frag: string) => Object.keys(deps).some((d) => d.includes(frag));
  const hasFile = (frag: string) => paths.some((p) => p.includes(frag));

  const solana =
    SOLANA_DEP_HINTS.some((h) => anyDep(h)) || hasFile('Anchor.toml') || hasFile('programs/');
  const solanaTag = solana ? ' + Solana' : '';

  if (hasFile('Anchor.toml')) return { framework: 'anchor', projectType: `Anchor program${solanaTag}` };
  if (has('next')) return { framework: 'next', projectType: `Next.js app${solanaTag}` };
  if (has('vite') || hasFile('vite.config.'))
    return { framework: 'vite-react', projectType: `Vite + React app${solanaTag}` };
  if (has('react')) return { framework: 'react', projectType: `React app${solanaTag}` };
  if (has('svelte')) return { framework: 'svelte', projectType: `Svelte app${solanaTag}` };
  if (has('vue')) return { framework: 'vue', projectType: `Vue app${solanaTag}` };
  if (paths.some((p) => p === 'Cargo.toml')) return { framework: 'rust', projectType: 'Rust crate' };
  if (pkg) return { framework: 'node', projectType: `Node project${solanaTag}` };
  return { framework: null, projectType: 'Unknown project' };
}

/** A compact textual tree: top of the repo, folders with child counts, capped. */
function summarizeStructure(paths: string[], maxLines = 160): string {
  const kept = paths.filter((p) => !isContextIgnored(p));
  const dirCounts = new Map<string, number>();
  for (const p of kept) {
    const parts = p.split('/');
    for (let depth = 1; depth < parts.length; depth++) {
      const dir = parts.slice(0, depth).join('/');
      dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
    }
  }
  // Show directories up to depth 2 plus root-level files.
  const lines: string[] = [];
  const dirs = [...dirCounts.keys()]
    .filter((d) => d.split('/').length <= 2)
    .sort();
  for (const d of dirs) {
    const indent = '  '.repeat(d.split('/').length - 1);
    lines.push(`${indent}${d.split('/').pop()}/ (${dirCounts.get(d)})`);
    if (lines.length >= maxLines) break;
  }
  const rootFiles = kept.filter((p) => !p.includes('/')).sort();
  for (const f of rootFiles) {
    lines.push(f);
    if (lines.length >= maxLines) break;
  }
  return lines.join('\n');
}

/** Priority order for "important files" we read into context. */
function importantCandidates(paths: string[]): string[] {
  const exact = [
    'package.json',
    'README.md',
    'readme.md',
    'Anchor.toml',
    'Cargo.toml',
    'vite.config.ts',
    'vite.config.js',
    'next.config.js',
    'next.config.mjs',
    'tsconfig.json',
    'tailwind.config.js',
    'tailwind.config.ts',
    'index.html',
  ];
  const globs = [
    /^src\/main\.(t|j)sx?$/,
    /^src\/App\.(t|j)sx?$/,
    /^src\/index\.(t|j)sx?$/,
    /^src\/app\.(t|j)sx?$/,
    /^app\/layout\.(t|j)sx?$/,
    /^app\/page\.(t|j)sx?$/,
    /^src\/pages\/index\.(t|j)sx?$/,
    /lib\.rs$/,
    /^src\/lib\.(t|j)sx?$/,
  ];
  const set = new Set<string>();
  const pathSet = new Set(paths.map(normalizePath));
  for (const e of exact) if (pathSet.has(e)) set.add(e);
  for (const g of globs) for (const p of paths) if (g.test(p)) set.add(p);
  return [...set];
}

export async function buildRepositoryContext(
  input: BuildContextInput,
): Promise<RepositoryContext> {
  const paths = input.tree.filter((e) => e.type === 'blob').map((e) => e.path);

  // package.json
  let pkg: Record<string, unknown> | null = null;
  const pkgText = await safeRead(input.readFile, 'package.json');
  if (pkgText) {
    try {
      pkg = JSON.parse(pkgText) as Record<string, unknown>;
    } catch {
      pkg = null;
    }
  }
  const dependencies = mergeDeps(pkg, 'dependencies');
  const devDependencies = mergeDeps(pkg, 'devDependencies');
  const allDeps = { ...dependencies, ...devDependencies };

  const { framework, projectType } = detectFrameworkAndType(pkg, paths, allDeps);
  const structure = summarizeStructure(paths);

  // Important files, within a byte budget.
  const importantFiles: Record<string, string> = {};
  let budget = TOTAL_CONTEXT_CHARS;
  for (const candidate of importantCandidates(paths)) {
    if (budget <= 0) break;
    const text = await safeRead(input.readFile, candidate);
    if (text === null) continue;
    const slice = text.slice(0, Math.min(PER_FILE_CHARS, budget));
    importantFiles[candidate] = slice;
    budget -= slice.length;
  }

  const solanaDeps = Object.keys(allDeps).filter((d) =>
    SOLANA_DEP_HINTS.some((h) => d.includes(h)),
  );
  const architectureSummary = [
    `Project type: ${projectType}.`,
    framework ? `Framework: ${framework}.` : '',
    solanaDeps.length ? `Solana packages: ${solanaDeps.join(', ')}.` : 'No Solana packages detected yet.',
    `${paths.length} tracked files.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    repo: input.repo,
    branch: input.branch,
    projectType,
    framework,
    dependencies,
    devDependencies,
    structure,
    importantFiles,
    architectureSummary,
    totalFiles: paths.length,
  };
}

async function safeRead(
  readFile: (path: string) => Promise<string | null>,
  path: string,
): Promise<string | null> {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}
