import { launchApp } from './util';
import { Reveal } from './Reveal';
import { SolanaMark } from './SolanaMark';
import { DOCS_URL } from './util';

export function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-6 py-32 text-center">
      {/* atmospheric glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(56,224,255,0.18), rgba(155,92,255,0.12) 45%, transparent 70%)' }}
      />

      <Reveal variant="scale" className="relative">
        <div className="mx-auto mb-8 w-fit animate-floaty">
          <SolanaMark size={92} />
        </div>
      </Reveal>

      <Reveal variant="up" delay={80}>
        <h2 className="relative font-display text-[clamp(2.6rem,7vw,5.6rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
          Build without <span className="text-gradient">limits.</span>
        </h2>
      </Reveal>

      <Reveal variant="up" delay={140}>
        <p className="relative mx-auto mt-6 max-w-md text-lg text-muted">
          Describe it. Build it. Review it. Ship it — your next Solana project starts here.
        </p>
      </Reveal>

      <Reveal variant="up" delay={220}>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button type="button" onClick={launchApp} className="cta cta-primary">
            Start Building
            <span className="cta-arrow">→</span>
          </button>
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="cta cta-ghost">
            Explore the Docs
          </a>
        </div>
      </Reveal>
    </section>
  );
}
