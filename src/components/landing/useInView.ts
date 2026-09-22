import { useEffect, useRef, useState } from 'react';

interface Options {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/** IntersectionObserver hook for scroll-triggered reveals. */
export function useInView<T extends HTMLElement>(opts: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (opts.once) io.disconnect();
          } else if (!opts.once) {
            setInView(false);
          }
        }
      },
      { rootMargin: opts.rootMargin ?? '0px 0px -12% 0px', threshold: opts.threshold ?? 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts.once, opts.rootMargin, opts.threshold]);

  return [ref, inView] as const;
}
