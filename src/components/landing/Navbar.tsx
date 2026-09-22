import { useEffect, useState } from 'react';
import { launchApp } from './util';
import { SolanaMark } from './SolanaMark';
import { DOCS_URL, GITHUB_URL, scrollToId } from './util';

const LINKS: { label: string; id?: string; href?: string }[] = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how' },
  { label: 'Privacy', id: 'privacy' },
  { label: 'For Builders', id: 'builders' },
  { label: 'Docs', href: DOCS_URL },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'py-2' : 'py-4'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center gap-4 rounded-full px-4 py-2 transition-all duration-500 ${
          scrolled ? 'glass shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)]' : 'border border-transparent'
        }`}
        style={{ marginInline: 'max(1rem, calc((100% - 72rem) / 2))' }}
      >
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-2.5"
        >
          <span className="relative inline-flex animate-floaty">
            <SolanaMark size={26} />
          </span>
          <span className="hidden whitespace-nowrap text-sm font-semibold tracking-tight text-ink sm:inline">
            Solana Studio
          </span>
        </a>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) =>
            l.href ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ) : (
              <button
                key={l.label}
                type="button"
                onClick={() => scrollToId(l.id!)}
                className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </button>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.83 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
            </svg>
          </a>
          <button
            type="button"
            onClick={launchApp}
            className="cta cta-primary whitespace-nowrap !px-4 !py-2 !text-sm"
          >
            Launch App
          </button>
        </div>
      </div>
    </header>
  );
}
