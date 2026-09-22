import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import { SolanaMark } from './SolanaMark';
import { trackSpotlight } from './util';

function Cell({
  span,
  kicker,
  title,
  children,
  icon,
  delay = 0,
}: {
  span: string;
  kicker: string;
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal variant="scale" delay={delay} className={span}>
      <article
        onPointerMove={trackSpotlight}
        className="spotlight card-premium flex h-full flex-col p-6"
      >
        <div className="flex items-center justify-between">
          <span className="kicker">{kicker}</span>
          {icon && <span className="icon-tile !h-9 !w-9">{icon}</span>}
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-white">{title}</h3>
        {children}
      </article>
    </Reveal>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function Bento() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal variant="up" className="mb-12 max-w-2xl">
        <span className="kicker">// capabilities</span>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-[1.03] tracking-[-0.035em] text-white">
          An engineering agent, <span className="text-gradient">wired into your repo.</span>
        </h2>
      </Reveal>

      <div className="bento">
        {/* Big — repo understanding */}
        <Cell
          span="span-4"
          kicker="context engine"
          title="Understands your repository"
          icon={<svg viewBox="0 0 24 24" width="18" height="18" {...stroke}><path d="M4 5h16M4 12h10M4 19h7" /></svg>}
        >
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Before proposing anything, the agent reads a focused slice of your codebase — framework,
            dependencies, structure — so changes fit how you actually build.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['package.json', 'src/App.tsx', 'Anchor.toml', '@solana/web3.js', 'vite.config.ts'].map((f) => (
              <span key={f} className="mono rounded-md border border-border/70 bg-black/30 px-2 py-1 text-[11px] text-muted">
                {f}
              </span>
            ))}
          </div>
          <div className="mono mt-3 text-[11px] text-sol">context built · 12 files · 2 solana deps</div>
        </Cell>

        {/* Plan-first */}
        <Cell
          span="span-2"
          kicker="plan-first"
          title="Plan before code"
          delay={60}
          icon={<svg viewBox="0 0 24 24" width="18" height="18" {...stroke}><path d="M5 6h14M5 10h14M5 14h9M5 18h9" /></svg>}
        >
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Every request becomes an approvable plan. Nothing runs until you say go.
          </p>
        </Cell>

        {/* Diff review */}
        <Cell
          span="span-2"
          kicker="review"
          title="Every diff, visible"
          delay={40}
          icon={<svg viewBox="0 0 24 24" width="18" height="18" {...stroke}><path d="M8 4v16M16 4v16" /><path d="M4 8h8M12 16h8" /></svg>}
        >
          <div className="mono mt-3 rounded-md border border-border/60 bg-black/30 p-2 text-[11px] leading-5">
            <div className="text-sol">+ &lt;WalletButton /&gt;</div>
            <div className="text-warning">~ src/App.tsx</div>
          </div>
        </Cell>

        {/* GitHub native */}
        <Cell
          span="span-2"
          kicker="source of truth"
          title="GitHub-native"
          delay={100}
          icon={
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 1a11 11 0 0 0-3.48 21.44c.55.1.75-.24.75-.53v-1.86c-3.06.67-3.7-1.48-3.7-1.48-.5-1.28-1.23-1.62-1.23-1.62-1-.69.08-.67.08-.67 1.1.08 1.69 1.14 1.69 1.14.98 1.69 2.58 1.2 3.2.92.1-.72.39-1.2.7-1.48-2.44-.28-5.01-1.22-5.01-5.44 0-1.2.43-2.18 1.14-2.95-.11-.28-.5-1.4.11-2.92 0 0 .93-.3 3.05 1.13a10.5 10.5 0 0 1 5.56 0c2.12-1.43 3.05-1.13 3.05-1.13.61 1.52.22 2.64.11 2.92.71.77 1.14 1.75 1.14 2.95 0 4.23-2.58 5.16-5.03 5.43.4.34.75 1.01.75 2.04v3.02c0 .29.2.64.76.53A11 11 0 0 0 12 1Z" />
            </svg>
          }
        >
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Branch, commit, and open a PR straight to your repo. Your account, your rules.
          </p>
        </Cell>

        {/* Browser / no backend */}
        <Cell
          span="span-2"
          kicker="zero setup"
          title="Runs in your browser"
          delay={40}
          icon={<svg viewBox="0 0 24 24" width="18" height="18" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18" /></svg>}
        >
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No install, no local agent, no server holding your code — the workspace is the browser tab.
          </p>
        </Cell>

        {/* Solana aware — full-width closer */}
        <Cell span="span-6" kicker="solana-aware" title="Speaks Solana natively" icon={<SolanaMark size={18} glow={false} />}>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Wallet adapters, <span className="mono text-ink/80">@solana/web3.js</span>, Anchor programs,
            SPL tokens, devnet — the agent understands the ecosystem, not just generic JavaScript.
          </p>
        </Cell>
      </div>
    </section>
  );
}
