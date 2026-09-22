import { launchApp } from './util';
import { SolanaMark } from './SolanaMark';
import { DOCS_URL, GITHUB_URL, scrollToId } from './util';

export function Footer() {
  return (
    <footer className="relative border-t border-border/60 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="animate-floaty">
              <SolanaMark size={24} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">Solana Studio</span>
          </div>
          <p className="mt-2 text-sm text-muted">Build the future of Solana.</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-ink">
            GitHub
          </a>
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-ink">
            Docs
          </a>
          <button type="button" onClick={() => scrollToId('how')} className="text-muted transition-colors hover:text-ink">
            How it works
          </button>
          <button type="button" onClick={() => scrollToId('privacy')} className="text-muted transition-colors hover:text-ink">
            Privacy
          </button>
          <button type="button" onClick={launchApp} className="text-ink transition-colors hover:text-aqua">
            Launch App →
          </button>
        </nav>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-border/40 pt-6 text-xs text-faint">
        Runs in your browser · GitHub is the source of truth · You control every write.
      </div>
    </footer>
  );
}
