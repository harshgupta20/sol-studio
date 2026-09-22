import { Reveal } from './Reveal';
import { trackSpotlight } from './util';

const ECOSYSTEM = [
  '@solana/web3.js',
  '@solana/kit',
  'wallet-adapter',
  'Anchor',
  'SPL tokens',
  'programs',
  'IDLs',
  'devnet',
];

const FRAGMENTS = [
  { label: 'Program', value: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  { label: 'Transaction', value: '5Nq8s…5rP2f · confirmed · devnet' },
  { label: 'Wallet', value: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
];

export function SolanaSection() {
  return (
    <section id="builders" className="relative mx-auto max-w-6xl overflow-hidden px-6 py-28">
      {/* faint constellation */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden>
        <g stroke="rgba(56,224,255,0.18)" strokeWidth="1">
          <line x1="12%" y1="20%" x2="34%" y2="42%" />
          <line x1="34%" y1="42%" x2="62%" y2="26%" />
          <line x1="62%" y1="26%" x2="84%" y2="52%" />
          <line x1="34%" y1="42%" x2="48%" y2="74%" />
          <line x1="84%" y1="52%" x2="70%" y2="80%" />
        </g>
        {[
          ['12%', '20%'],
          ['34%', '42%'],
          ['62%', '26%'],
          ['84%', '52%'],
          ['48%', '74%'],
          ['70%', '80%'],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#38e0ff" className="animate-twinkle" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </svg>

      <div className="relative text-center">
        <Reveal variant="up">
          <span className="kicker center mb-4 justify-center">// for builders</span>
          <h2 className="mx-auto max-w-4xl font-display text-[clamp(2.2rem,6vw,4.8rem)] font-bold leading-[1.0] tracking-[-0.04em] text-white">
            Built for the builders
            <br />
            of <span className="text-gradient animate-gradientPan">Solana.</span>
          </h2>
        </Reveal>
        <Reveal variant="up" delay={100}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            From wallets and tokens to programs and DeFi interfaces, build with an AI workspace
            designed around the Solana ecosystem — not a generic assistant bolted onto crypto.
          </p>
        </Reveal>

        <Reveal variant="fade" delay={160}>
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {ECOSYSTEM.map((e) => (
              <span key={e} className="mono glass rounded-full px-4 py-1.5 text-sm text-ink/85">
                {e}
              </span>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {FRAGMENTS.map((f, i) => (
            <Reveal key={f.label} variant="scale" delay={i * 90}>
              <div
                onPointerMove={trackSpotlight}
                className="spotlight card-premium p-4 text-left"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-aqua">{f.label}</div>
                <div className="mono mt-2 truncate text-xs text-muted" title={f.value}>
                  {f.value}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
