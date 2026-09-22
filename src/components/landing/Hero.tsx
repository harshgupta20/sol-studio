import { launchApp } from './util';
import { AgentConsole } from './AgentConsole';
import { PipelineStrip } from './PipelineStrip';
import { Reveal } from './Reveal';
import { scrollToId } from './util';

const TRUST = ['No install', 'Your keys, your code', 'Devnet-ready'];

export function Hero() {
  return (
    <section id="top" className="relative mx-auto max-w-6xl px-6 pb-16 pt-32 lg:pt-36">
      <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        {/* Copy */}
        <div>
          <Reveal variant="fade">
            <span className="kicker">// ai agent · github-native · solana</span>
          </Reveal>

          <Reveal variant="up" delay={70}>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,6.4vw,5rem)] font-bold leading-[0.96] tracking-[-0.035em] text-white">
              The control plane
              <br />
              for <span className="text-gradient animate-gradientPan">Solana engineering.</span>
            </h1>
          </Reveal>

          <Reveal variant="up" delay={150}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Describe a change. An AI agent reads your GitHub repository, plans it, writes it, and
              opens the pull request — entirely in your browser.
            </p>
          </Reveal>

          <Reveal variant="up" delay={220}>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={launchApp} className="cta cta-primary">
                Start Building
                <span className="cta-arrow">→</span>
              </button>
              <button type="button" onClick={() => scrollToId('how')} className="cta cta-ghost">
                See how it works
              </button>
            </div>
          </Reveal>

          <Reveal variant="fade" delay={300}>
            <ul className="mono mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-faint">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="text-sol">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Live agent console */}
        <Reveal variant="scale" delay={200} className="relative">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl blur-3xl"
            style={{ background: 'radial-gradient(circle at 70% 30%, rgba(56,224,255,0.16), rgba(155,92,255,0.12) 45%, transparent 72%)' }}
          />
          <AgentConsole />
        </Reveal>
      </div>

      {/* Full-width pipeline band */}
      <Reveal variant="fade" delay={120}>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
          <span className="kicker shrink-0">// the loop</span>
          <PipelineStrip className="sm:ml-2" />
        </div>
      </Reveal>
    </section>
  );
}
