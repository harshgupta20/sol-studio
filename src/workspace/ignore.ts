// What to keep out of AI context (and de-emphasize in the explorer): dependency
// dirs, build output, binaries, lockfiles, and secrets. Keeps prompts small,
// relevant, and free of anything sensitive.

import { extname, isSecretPath, normalizePath } from '../utils/paths';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.parcel-cache',
  '.turbo',
  'coverage',
  '.nyc_output',
  'target', // rust/anchor build
  '.anchor',
  'vendor',
  '.vercel',
  '.netlify',
  '.idea',
  '.vscode',
]);

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp4', 'mov', 'webm', 'avi', 'mp3', 'wav', 'ogg', 'flac',
  'zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'bz2',
  'pdf', 'wasm', 'exe', 'dll', 'so', 'dylib', 'bin', 'node',
  'class', 'jar', 'o', 'a', 'lib',
  'lockb', // bun.lockb
]);

const LOCKFILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'npm-shrinkwrap.json',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'composer.lock',
  'Gemfile.lock',
]);

function baseOf(p: string): string {
  const n = normalizePath(p);
  const i = n.lastIndexOf('/');
  return i === -1 ? n : n.slice(i + 1);
}

/** True if this path lives inside a dependency/build/ignored directory. */
export function inIgnoredDir(path: string): boolean {
  const segments = normalizePath(path).split('/');
  return segments.some((s) => IGNORE_DIRS.has(s));
}

/** Should this path be excluded from AI repository context? */
export function isContextIgnored(path: string): boolean {
  const n = normalizePath(path);
  if (inIgnoredDir(n)) return true;
  if (isSecretPath(n)) return true;
  const base = baseOf(n);
  if (LOCKFILES.has(base)) return true;
  if (BINARY_EXT.has(extname(n))) return true;
  return false;
}

/** Lighter filter for the explorer: hide dep/build dirs + binaries, keep the rest. */
export function isExplorerHidden(path: string): boolean {
  return inIgnoredDir(path);
}
