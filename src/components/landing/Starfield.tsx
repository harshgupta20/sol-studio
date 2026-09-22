import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface Star {
  x: number;
  y: number;
  r: number;
  a: number; // base alpha
  tw: number; // twinkle phase
  tws: number; // twinkle speed
  vy: number; // drift
  hue: 'w' | 't' | 'v';
}

const HUES: Record<Star['hue'], string> = {
  w: '255,255,255',
  t: '56,224,255',
  v: '155,92,255',
};

/**
 * Fixed full-viewport starfield behind everything. Draws once when reduced
 * motion is on; otherwise a gentle drifting/twinkling loop that pauses when the
 * tab is hidden. Particle count scales with viewport area (fewer on mobile).
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = width < 640 ? 0.00008 : 0.00014;
      const count = Math.min(220, Math.floor(width * height * density));
      stars = Array.from({ length: count }, () => {
        const roll = Math.random();
        const hue: Star['hue'] = roll > 0.9 ? 'v' : roll > 0.78 ? 't' : 'w';
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.3 + 0.3,
          a: Math.random() * 0.5 + 0.2,
          tw: Math.random() * Math.PI * 2,
          tws: Math.random() * 0.6 + 0.2,
          vy: Math.random() * 0.05 + 0.01,
          hue,
        };
      });
    };

    const drawStar = (s: Star, alpha: number) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${HUES[s.hue]},${alpha})`;
      ctx.fill();
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) drawStar(s, s.a);
    };

    let last = 0;
    const loop = (t: number) => {
      const dt = last ? (t - last) / 1000 : 0;
      last = t;
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.tw += s.tws * dt;
        s.y += s.vy;
        if (s.y > height + 2) s.y = -2;
        const alpha = s.a * (0.55 + 0.45 * Math.sin(s.tw));
        drawStar(s, alpha);
      }
      raf = requestAnimationFrame(loop);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (reduced) renderStatic();
      }, 150);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced && !raf) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    build();
    if (reduced) {
      renderStatic();
    } else {
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="landing-starfield" aria-hidden />;
}
