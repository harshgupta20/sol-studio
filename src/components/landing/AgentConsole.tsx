import { useEffect, useState } from 'react';
import { useInView } from './useInView';
import { useReducedMotion } from './useReducedMotion';

type Kind = 'cmd' | 'sys' | 'you' | 'step' | 'ok' | 'add' | 'mod' | 'pr';

const LINES: { k: Kind; t: string }[] = [
  { k: 'cmd', t: 'agent connect github' },
  { k: 'sys', t: 'repo understood · vite + react + @solana/web3.js' },
  { k: 'you', t: 'add a wallet connect button — devnet, modular' },
  { k: 'step', t: 'planning implementation' },
  { k: 'ok', t: 'plan ready · 5 steps · awaiting approval' },
  { k: 'step', t: 'implementing' },
  { k: 'add', t: '+ src/components/WalletButton.tsx' },
  { k: 'mod', t: '~ src/App.tsx' },
  { k: 'step', t: '3 files changed · opening pull request' },
  { k: 'pr', t: '✓ PR #128 → agent/add-wallet-connect' },
];

const GLYPH: Record<Kind, { g: string; gc: string; tc: string }> = {
  cmd: { g: '›', gc: 'text-aqua', tc: 'text-ink' },
  sys: { g: '·', gc: 'text-faint', tc: 'text-muted' },
  you: { g: '❯', gc: 'text-violet', tc: 'text-ink' },
  step: { g: '◐', gc: 'text-aqua', tc: 'text-muted' },
  ok: { g: '✓', gc: 'text-sol', tc: 'text-ink/90' },
  add: { g: '+', gc: 'text-sol', tc: 'text-ink/90' },
  mod: { g: '~', gc: 'text-warning', tc: 'text-ink/90' },
  pr: { g: '✓', gc: 'text-sol', tc: 'text-sol' },
};

export function AgentConsole({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ once: true });
  const [count, setCount] = useState(reduced ? LINES.length : 0);

  useEffect(() => {
    if (reduced || !inView) return;
    setCount(0);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= LINES.length) window.clearInterval(timer);
    }, 520);
    return () => window.clearInterval(timer);
  }, [inView, reduced]);

  const shown = LINES.slice(0, count);
  const done = count >= LINES.length;

  return (
    <div ref={ref} className={`console ${className}`}>
      <div className="console-bar">
        <span className="console-dot bg-[#ff5f57]" />
        <span className="console-dot bg-[#febc2e]" />
        <span className="console-dot bg-[#28c840]" />
        <span className="mono ml-2 text-[11px] text-faint">agent · run</span>
        <span className="mono ml-auto flex items-center gap-1.5 text-[11px] text-sol">
          <span className="h-1.5 w-1.5 rounded-full bg-sol shadow-[0_0_8px_rgba(20,241,149,0.9)]" />
          live
        </span>
      </div>
      <div className="console-body min-h-[300px]">
        {shown.map((l, idx) => {
          const s = GLYPH[l.k];
          const isLast = idx === shown.length - 1;
          return (
            <div key={idx} className="console-line">
              <span className={`w-3 shrink-0 ${s.gc} ${l.k === 'step' && isLast && !done ? 'animate-pulseSoft' : ''}`}>
                {s.g}
              </span>
              <span className={s.tc}>
                {l.t}
                {isLast && !done && !reduced && <span className="animate-blink text-aqua">▏</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
