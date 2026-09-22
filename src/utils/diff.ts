// A compact line-level diff (LCS) for the review UI. Produces rows we can render
// as a unified list or split side-by-side. Guarded against pathologically large
// inputs so the O(n·m) table never blows up the tab.

export type DiffRowType = 'equal' | 'add' | 'del';

export interface DiffRow {
  type: DiffRowType;
  oldLine: number | null;
  newLine: number | null;
  text: string;
}

export interface DiffStat {
  added: number;
  removed: number;
}

const MAX_LINES = 6000;

function splitLines(s: string): string[] {
  if (s === '') return [];
  const lines = s.split('\n');
  // Drop a single trailing empty line produced by a final newline.
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Longest-common-subsequence line diff. */
export function lineDiff(oldText: string, newText: string): DiffRow[] {
  const a = splitLines(oldText ?? '');
  const b = splitLines(newText ?? '');

  // Fallback for huge files: emit as a wholesale delete + add (still reviewable).
  if (a.length > MAX_LINES || b.length > MAX_LINES) {
    const rows: DiffRow[] = [];
    a.forEach((t, i) => rows.push({ type: 'del', oldLine: i + 1, newLine: null, text: t }));
    b.forEach((t, i) => rows.push({ type: 'add', oldLine: null, newLine: i + 1, text: t }));
    return rows;
  }

  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length of a[i:], b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: 'equal', oldLine: i + 1, newLine: j + 1, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'del', oldLine: i + 1, newLine: null, text: a[i] });
      i++;
    } else {
      rows.push({ type: 'add', oldLine: null, newLine: j + 1, text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: 'del', oldLine: i + 1, newLine: null, text: a[i++] });
  while (j < m) rows.push({ type: 'add', oldLine: null, newLine: j + 1, text: b[j++] });
  return rows;
}

export function diffStat(rows: DiffRow[]): DiffStat {
  let added = 0;
  let removed = 0;
  for (const r of rows) {
    if (r.type === 'add') added++;
    else if (r.type === 'del') removed++;
  }
  return { added, removed };
}

/**
 * Collapse long runs of unchanged lines into a marker so big files stay
 * scannable. Keeps `context` lines around each change.
 */
export interface DiffBlock {
  kind: 'rows' | 'gap';
  rows?: DiffRow[];
  gapLines?: number;
}

export function collapseDiff(rows: DiffRow[], context = 3): DiffBlock[] {
  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, idx) => {
    if (r.type !== 'equal') {
      for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) {
        keep[k] = true;
      }
    }
  });
  const blocks: DiffBlock[] = [];
  let buffer: DiffRow[] = [];
  let gap = 0;
  const flushBuffer = () => {
    if (buffer.length) {
      blocks.push({ kind: 'rows', rows: buffer });
      buffer = [];
    }
  };
  const flushGap = () => {
    if (gap > 0) {
      blocks.push({ kind: 'gap', gapLines: gap });
      gap = 0;
    }
  };
  rows.forEach((r, idx) => {
    if (keep[idx]) {
      flushGap();
      buffer.push(r);
    } else {
      flushBuffer();
      gap++;
    }
  });
  flushBuffer();
  flushGap();
  return blocks;
}
