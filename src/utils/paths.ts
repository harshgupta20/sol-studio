// Repository-relative path helpers + the security-critical path validator.
// Ported in spirit from the old local FilesystemSandbox: since AI-generated
// paths are untrusted input, EVERY path an operation targets must pass here.

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

export function basename(p: string): string {
  const n = normalizePath(p);
  const i = n.lastIndexOf('/');
  return i === -1 ? n : n.slice(i + 1);
}

export function dirname(p: string): string {
  const n = normalizePath(p);
  const i = n.lastIndexOf('/');
  return i === -1 ? '' : n.slice(0, i);
}

export function extname(p: string): string {
  const base = basename(p);
  const i = base.lastIndexOf('.');
  return i <= 0 ? '' : base.slice(i + 1).toLowerCase();
}

/** Filenames that look like secrets — blocked from AI writes AND from context. */
const SECRET_PATTERNS: RegExp[] = [
  /^\.env$/i,
  /^\.env\.local$/i,
  /^\.env\.[^.]*\.local$/i,
  /(^|[._-])secret/i,
  /(^|[._-])credential/i,
  /keypair/i,
  /mnemonic/i,
  /seed(-?phrase)?/i,
  /^id\.json$/i, // default Solana CLI keypair filename
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
];

const SECRET_DIR_SEGMENTS = new Set([
  '.ssh',
  '.gnupg',
  '.aws',
  '.gcloud',
  '.kube',
  '.docker',
]);

/** `.env.example` / `.env.sample` / `.env.template` are safe, real `.env` is not. */
export function isSecretPath(p: string): boolean {
  const n = normalizePath(p);
  const segments = n.split('/').filter(Boolean);
  for (const seg of segments) {
    if (SECRET_DIR_SEGMENTS.has(seg)) return true;
  }
  const base = basename(n);
  if (/^\.env\.(example|sample|template)$/i.test(base)) return false;
  return SECRET_PATTERNS.some((re) => re.test(base));
}

export interface PathCheck {
  ok: boolean;
  reason?: string;
}

// Matches ASCII control chars (0x00-0x1F) and DEL (0x7F). Written with hex
// escapes so no literal control bytes live in source.
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Validate an AI/user-supplied repository-relative path.
 * Rejects: empty, absolute, Windows drive/UNC, `..` traversal, control chars,
 * over-long paths. Secret files are allowed through only when `allowSecret`.
 */
export function checkRepoPath(input: unknown, opts: { allowSecret?: boolean } = {}): PathCheck {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, reason: 'Path must be a non-empty string.' };
  }
  const raw = input.trim();
  if (CONTROL_CHARS.test(raw)) {
    return { ok: false, reason: 'Path contains control characters.' };
  }
  if (/^[a-zA-Z]:[\\/]/.test(raw) || raw.startsWith('\\\\')) {
    return { ok: false, reason: 'Absolute Windows paths are not allowed.' };
  }
  if (raw.startsWith('/')) {
    return {
      ok: false,
      reason: 'Absolute paths are not allowed — use a repository-relative path.',
    };
  }
  const n = normalizePath(raw);
  const segments = n.split('/');
  if (segments.some((s) => s === '..')) {
    return { ok: false, reason: 'Path traversal ("..") is not allowed.' };
  }
  if (segments.some((s) => s === '')) {
    return { ok: false, reason: 'Path has an empty segment.' };
  }
  if (n.length > 400) {
    return { ok: false, reason: 'Path is unreasonably long.' };
  }
  if (!opts.allowSecret && isSecretPath(n)) {
    return { ok: false, reason: 'Writing to secret / credential files is blocked.' };
  }
  return { ok: true };
}

// --- Monaco language mapping -------------------------------------------------

const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  jsonc: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  rs: 'rust',
  go: 'go',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  xml: 'xml',
  svg: 'xml',
};

export function languageForPath(p: string): string {
  const base = basename(p).toLowerCase();
  if (base === 'dockerfile') return 'dockerfile';
  if (base === 'anchor.toml' || base.endsWith('.toml')) return 'ini';
  return EXT_LANG[extname(p)] ?? 'plaintext';
}
