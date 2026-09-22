import type { AIProviderId } from '../../types';

// Brand colours.
export const PROVIDER_COLOR: Record<AIProviderId, string> = {
  anthropic: '#D97757', // Claude coral
  openai: '#10A37F', // OpenAI teal
};

/** Colored brand mark for an AI provider. Decorative (paired with a text label). */
export function ProviderIcon({
  provider,
  size = 18,
  className = '',
  glow = false,
}: {
  provider: AIProviderId;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const color = PROVIDER_COLOR[provider] ?? PROVIDER_COLOR.anthropic;
  const style = glow ? { filter: `drop-shadow(0 0 5px ${color}66)` } : undefined;
  return provider === 'openai' ? (
    <OpenAIMark size={size} className={className} color={color} style={style} />
  ) : (
    <ClaudeMark size={size} className={className} color={color} style={style} />
  );
}

/** Anthropic / Claude — the coral radial spark. */
function ClaudeMark({
  size,
  className,
  color,
  style,
}: {
  size: number;
  className: string;
  color: string;
  style?: React.CSSProperties;
}) {
  const rays = 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden
    >
      <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2;
          const inner = 2.6;
          const outer = i % 2 === 0 ? 9.4 : 6.6;
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * inner}
              y1={12 + Math.sin(a) * inner}
              x2={12 + Math.cos(a) * outer}
              y2={12 + Math.sin(a) * outer}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** OpenAI / ChatGPT — the teal interlocking knot. */
function OpenAIMark({
  size,
  className,
  color,
  style,
}: {
  size: number;
  className: string;
  color: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden
    >
      <g fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="3.5" ry="8.4" transform="rotate(0 12 12)" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8.4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8.4" transform="rotate(120 12 12)" />
      </g>
    </svg>
  );
}
