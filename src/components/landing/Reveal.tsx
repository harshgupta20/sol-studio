import type { ElementType, ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useInView } from './useInView';

type Variant = 'up' | 'scale' | 'tilt' | 'fade';

/** Scroll-triggered reveal. `delay` (ms) drives staggering. */
export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className = '',
  as,
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const Tag = (as ?? 'div') as ElementType;
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ once: true });
  const visible = reduced || inView;

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
