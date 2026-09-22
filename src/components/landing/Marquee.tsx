const ITEMS = [
  '@solana/web3.js',
  '@solana/kit',
  'wallet-adapter',
  'Anchor',
  'SPL Token',
  'Metaplex',
  'GitHub',
  'Vite',
  'Next.js',
  'TypeScript',
  'devnet',
  'IDLs',
];

/** Seamless auto-scrolling ecosystem strip (items duplicated for the loop). */
export function Marquee() {
  const items = [...ITEMS, ...ITEMS];
  return (
    <div className="relative border-y border-white/[0.06] py-5">
      <div className="marquee">
        <div className="marquee-track">
          {items.map((it, i) => (
            <span key={i} className="mono flex items-center gap-2 text-sm text-muted">
              <span className="text-aqua/70">◆</span>
              {it}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
