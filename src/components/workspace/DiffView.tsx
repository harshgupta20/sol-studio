import { useMemo, useState } from 'react';
import type { ChangeType } from '../../types';
import { collapseDiff, diffStat, lineDiff, type DiffRow } from '../../utils/diff';

export function DiffView({
  oldText,
  newText,
  changeType,
}: {
  oldText: string;
  newText: string;
  changeType: ChangeType;
}) {
  const [split, setSplit] = useState(false);
  const rows = useMemo(() => lineDiff(oldText, newText), [oldText, newText]);
  const blocks = useMemo(() => collapseDiff(rows), [rows]);
  const stat = useMemo(() => diffStat(rows), [rows]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="capitalize text-faint">{changeType}</span>
          <span className="text-success">+{stat.added}</span>
          <span className="text-error">-{stat.removed}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`rounded px-2 py-0.5 ${!split ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'}`}
            onClick={() => setSplit(false)}
          >
            Unified
          </button>
          <button
            type="button"
            className={`rounded px-2 py-0.5 ${split ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'}`}
            onClick={() => setSplit(true)}
          >
            Split
          </button>
        </div>
      </div>

      <div className="mono flex-1 overflow-auto bg-surface text-xs leading-relaxed">
        {split ? <SplitView blocks={blocks} /> : <UnifiedView blocks={blocks} />}
      </div>
    </div>
  );
}

const ROW_BG: Record<DiffRow['type'], string> = {
  add: 'bg-success/10',
  del: 'bg-error/10',
  equal: '',
};
const SIGN: Record<DiffRow['type'], string> = { add: '+', del: '-', equal: ' ' };
const SIGN_COLOR: Record<DiffRow['type'], string> = {
  add: 'text-success',
  del: 'text-error',
  equal: 'text-faint',
};

function Gap({ n }: { n: number }) {
  return (
    <div className="select-none bg-panel/60 px-3 py-1 text-center text-[10px] text-faint">
      ⋯ {n} unchanged line{n === 1 ? '' : 's'} ⋯
    </div>
  );
}

function UnifiedView({ blocks }: { blocks: ReturnType<typeof collapseDiff> }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'gap' ? (
          <Gap key={i} n={b.gapLines ?? 0} />
        ) : (
          b.rows!.map((r, j) => (
            <div key={`${i}-${j}`} className={`flex ${ROW_BG[r.type]}`}>
              <span className="w-10 shrink-0 select-none px-1 text-right text-faint/70">
                {r.oldLine ?? ''}
              </span>
              <span className="w-10 shrink-0 select-none px-1 text-right text-faint/70">
                {r.newLine ?? ''}
              </span>
              <span className={`w-4 shrink-0 select-none text-center ${SIGN_COLOR[r.type]}`}>
                {SIGN[r.type]}
              </span>
              <span className="whitespace-pre-wrap break-all pr-3 text-ink/90">{r.text || ' '}</span>
            </div>
          ))
        ),
      )}
    </>
  );
}

function SplitView({ blocks }: { blocks: ReturnType<typeof collapseDiff> }) {
  return (
    <div>
      {blocks.map((b, i) =>
        b.kind === 'gap' ? (
          <Gap key={i} n={b.gapLines ?? 0} />
        ) : (
          <div key={i} className="grid grid-cols-2 divide-x divide-border">
            <div>
              {b.rows!.map((r, j) =>
                r.type === 'add' ? (
                  <div key={j} className="px-2 py-px">
                    &nbsp;
                  </div>
                ) : (
                  <div key={j} className={`flex ${r.type === 'del' ? 'bg-error/10' : ''}`}>
                    <span className="w-9 shrink-0 select-none px-1 text-right text-faint/70">
                      {r.oldLine ?? ''}
                    </span>
                    <span className="whitespace-pre-wrap break-all pr-2 text-ink/90">
                      {r.text || ' '}
                    </span>
                  </div>
                ),
              )}
            </div>
            <div>
              {b.rows!.map((r, j) =>
                r.type === 'del' ? (
                  <div key={j} className="px-2 py-px">
                    &nbsp;
                  </div>
                ) : (
                  <div key={j} className={`flex ${r.type === 'add' ? 'bg-success/10' : ''}`}>
                    <span className="w-9 shrink-0 select-none px-1 text-right text-faint/70">
                      {r.newLine ?? ''}
                    </span>
                    <span className="whitespace-pre-wrap break-all pr-2 text-ink/90">
                      {r.text || ' '}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
