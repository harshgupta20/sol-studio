import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

const INTERACTIVE = 'a, button, [data-cursor="hover"], input, select, textarea';

/**
 * A subtle two-part cursor: a precise dot + a soft trailing ring that expands
 * over interactive elements. Only active on fine pointers with motion allowed;
 * fully removed (and the native cursor restored) otherwise.
 */
export function CustomCursor() {
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    if (reduced || !fine) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add('has-custom-cursor');

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let rx = tx;
    let ry = ty;
    let raf = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      dot.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(INTERACTIVE);
      ring.classList.toggle('is-hover', Boolean(el));
    };
    const onLeaveWindow = () => {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    const loop = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerleave', onLeaveWindow);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerleave', onLeaveWindow);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <>
      <div ref={ringRef} className="landing-cursor-ring" aria-hidden />
      <div ref={dotRef} className="landing-cursor-dot" aria-hidden />
    </>
  );
}
