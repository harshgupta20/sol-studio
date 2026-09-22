import { useId } from 'react';

/**
 * A Solana-inspired emblem: three parallel bars filled with the teal→cyan→violet
 * energy gradient. Reused across hero, privacy, and footer for visual continuity.
 */
export function SolanaMark({
  size = 64,
  className = '',
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const gid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={
        glow
          ? {
              filter:
                'drop-shadow(0 0 14px rgba(56,224,255,0.45)) drop-shadow(0 0 34px rgba(155,92,255,0.30))',
            }
          : undefined
      }
      aria-hidden
    >
      <defs>
        <linearGradient id={`sol-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14f1c8" />
          <stop offset="0.5" stopColor="#38e0ff" />
          <stop offset="1" stopColor="#9b5cff" />
        </linearGradient>
      </defs>
      <g fill={`url(#sol-${gid})`}>
        <path d="M18 34 L30 20 L82 20 L70 34 Z" />
        <path d="M18 57 L30 43 L82 43 L70 57 Z" />
        <path d="M18 80 L30 66 L82 66 L70 80 Z" />
      </g>
    </svg>
  );
}
