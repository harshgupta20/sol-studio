import { Reveal } from './Reveal';
import { useInView } from './useInView';
import { useReducedMotion } from './useReducedMotion';

const POINTS = [
  'Runs in your browser — no custom backend, no permanent server-side workspace',
  'GitHub stays the source of truth, under your account',
  'You control every write — review the full diff before any commit',
  'The agent receives only the context required for the task you asked for',
  'No unnecessary repository persistence',
];

export function PrivacySection() {
  return (
    <section id="privacy" className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <Reveal variant="up">
            <span className="kicker">// privacy &amp; ownership</span>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-[1.02] tracking-[-0.035em] text-white">
              Your code shouldn't
              <br />
              belong to your <span className="text-gradient">tools.</span>
            </h2>
          </Reveal>

          <Reveal variant="up" delay={100}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Build with AI without surrendering ownership. Here's what that actually means,
              architecturally — no marketing absolutes.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-3">
            {POINTS.map((p, i) => (
              <Reveal key={p} as="li" variant="up" delay={i * 70}>
                <span className="flex gap-3 text-sm leading-relaxed text-ink/85">
                  <span className="mt-0.5 text-sol">▹</span>
                  {p}
                </span>
              </Reveal>
            ))}
          </ul>

          <Reveal variant="fade" delay={200}>
            <blockquote className="mt-8 border-l-2 border-aqua/40 pl-4 text-sm italic leading-relaxed text-muted">
              Your workspace runs in your browser. Your repository stays under your GitHub account.
              You decide what gets sent to the AI. You review what gets written back.
            </blockquote>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={120}>
          <OwnershipViz />
        </Reveal>
      </div>
    </section>
  );
}

function OwnershipViz() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const flowing = inView && !reduced;
  const lineClass = flowing ? 'flow-line' : '';

  return (
    <div ref={ref} className="relative mx-auto aspect-[4/3] w-full max-w-[520px]">
      <svg viewBox="0 0 400 300" className="h-full w-full">
        <defs>
          <linearGradient id="vault" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14f1c8" />
            <stop offset="1" stopColor="#9b5cff" />
          </linearGradient>
          <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(56,224,255,0.35)" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* flow lines */}
        <g fill="none" strokeWidth="1.5" strokeDasharray="6 10">
          <path d="M110 78 C150 110, 170 120, 196 138" stroke="#38e0ff" className={lineClass} opacity="0.7" />
          <path d="M290 78 C250 110, 230 120, 204 138" stroke="#9b5cff" className={lineClass} opacity="0.7" style={{ animationDelay: '0.4s' }} />
          <path d="M200 214 L200 190" stroke="#14f195" className={lineClass} opacity="0.7" style={{ animationDelay: '0.8s' }} />
        </g>

        {/* satellites */}
        <Node x={60} y={44} label="GITHUB" sub="repository" color="#38e0ff" />
        <Node x={260} y={44} label="AI" sub="assist only" color="#9b5cff" />
        <Node x={150} y={224} label="YOU" sub="control" color="#14f195" />

        {/* center vault */}
        <circle cx="200" cy="150" r="70" fill="url(#vaultGlow)" className={flowing ? 'animate-pulseGlow' : ''} />
        <rect x="150" y="128" width="100" height="44" rx="10" fill="rgba(6,9,18,0.9)" stroke="url(#vault)" strokeWidth="1.5" />
        <text x="200" y="147" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
          YOUR CODE
        </text>
        <text x="200" y="162" textAnchor="middle" fontSize="8" fill="#8a94a6" letterSpacing="1.5">
          IN YOUR BROWSER
        </text>
      </svg>

      <p className="mt-3 text-center text-xs text-faint">
        AI assists · <span className="text-ink/80">you</span> control · GitHub owns the repository
      </p>
    </div>
  );
}

function Node({ x, y, label, sub, color }: { x: number; y: number; label: string; sub: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width="80" height="34" rx="8" fill="rgba(8,11,22,0.85)" stroke={color} strokeOpacity="0.5" strokeWidth="1" />
      <text x={x + 40} y={y + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {label}
      </text>
      <text x={x + 40} y={y + 26} textAnchor="middle" fontSize="7.5" fill="#5a6474" letterSpacing="1">
        {sub.toUpperCase()}
      </text>
    </g>
  );
}
