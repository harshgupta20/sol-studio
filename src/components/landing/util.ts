// Small shared helpers for the landing page.

/** Configure these to point at your real repository / hosted docs. */
export const GITHUB_URL = 'https://github.com';
export const DOCS_URL = 'https://github.com';

/** Navigate into the application (the /app route). Used by the landing CTAs. */
export function launchApp(): void {
  window.location.assign('/app');
}

/** Smoothly scroll to a section id (honours reduced-motion). */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Radial-spotlight pointer tracking for `.spotlight` cards. */
export function trackSpotlight(e: React.PointerEvent<HTMLElement>): void {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}
