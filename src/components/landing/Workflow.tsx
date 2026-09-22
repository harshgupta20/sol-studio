import { Reveal } from './Reveal';

const STEPS = [
  { n: '01', title: 'Connect GitHub', body: 'Bring a repository with a token you control.' },
  { n: '02', title: 'Describe', body: 'Say what you want to build, in plain language.' },
  { n: '03', title: 'Understand', body: 'The agent reads a focused slice of your codebase.' },
  { n: '04', title: 'Plan', body: 'It proposes an ordered implementation plan.' },
  { n: '05', title: 'Approve', body: 'Nothing happens until you approve the plan.' },
  { n: '06', title: 'Implement', body: 'Structured changes are applied to a browser workspace.' },
  { n: '07', title: 'Review', body: 'Inspect the full diff. Edit anything by hand.' },
  { n: '08', title: 'Ship', body: 'Create a branch, commit, and open a pull request.' },
];

export function Workflow() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal variant="up" className="mx-auto mb-16 max-w-2xl text-center">
        <span className="kicker center">// how it works</span>
        <h2 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-bold tracking-[-0.035em] text-white">
          From idea to <span className="text-gradient">pull request.</span>
        </h2>
        <p className="mt-4 text-lg text-muted">Eight stages. You stay in control at every one.</p>
      </Reveal>

      <div className="relative pl-10 md:pl-0">
        {/* spine */}
        <div
          className="absolute left-4 top-0 h-full w-px md:left-1/2 md:-translate-x-1/2"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(56,224,255,0.5) 12%, rgba(155,92,255,0.5) 88%, transparent)' }}
        />
        <ol className="space-y-6 md:space-y-0">
          {STEPS.map((s, i) => {
            const left = i % 2 === 0;
            return (
              <li key={s.n} className="relative md:grid md:grid-cols-2 md:gap-10">
                {/* node */}
                <span
                  className="absolute left-4 top-3 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-aqua md:left-1/2"
                  style={{ boxShadow: '0 0 12px 2px rgba(56,224,255,0.8)' }}
                />
                <Reveal
                  variant={left ? 'up' : 'up'}
                  delay={(i % 2) * 60}
                  className={`md:py-6 ${left ? 'md:pr-12 md:text-right' : 'md:col-start-2 md:pl-12'}`}
                >
                  <div className="card-premium spotlight inline-block w-full p-5">
                    <div className="font-display text-xs font-bold tracking-[0.2em] text-gradient">{s.n}</div>
                    <h3 className="mt-1.5 text-base font-semibold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted">{s.body}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
