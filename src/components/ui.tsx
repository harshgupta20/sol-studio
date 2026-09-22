import type { ReactNode } from 'react';

// --- Status glyphs -----------------------------------------------------------
// ○ pending  ◐ running  ✓ passed  ✕ failed  ⚠ warning

export type GlyphKind = 'pending' | 'running' | 'success' | 'error' | 'warning' | 'skipped';

const GLYPH: Record<GlyphKind, string> = {
  pending: '○',
  running: '◐',
  success: '✓',
  error: '✕',
  warning: '⚠',
  skipped: '⊘',
};

const GLYPH_COLOR: Record<GlyphKind, string> = {
  pending: 'text-faint',
  running: 'text-running animate-pulseSoft',
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  skipped: 'text-faint',
};

export function StatusGlyph({ kind, className = '' }: { kind: GlyphKind; className?: string }) {
  return (
    <span
      className={`mono inline-block w-4 text-center leading-none ${GLYPH_COLOR[kind]} ${className}`}
      aria-hidden
    >
      {GLYPH[kind]}
    </span>
  );
}

// --- Status dot --------------------------------------------------------------

export function Dot({ online, connecting = false }: { online: boolean; connecting?: boolean }) {
  const color = connecting
    ? 'bg-warning'
    : online
      ? 'bg-success shadow-[0_0_8px_rgba(20,241,149,0.7)]'
      : 'bg-faint';
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${connecting ? 'animate-pulseSoft' : ''}`}
    />
  );
}

// --- Badges ------------------------------------------------------------------

export function NetworkBadge({ network }: { network: string }) {
  return (
    <span className="badge border-solPurple/30 bg-solPurple/10 text-[#c9a2ff]">
      {network.charAt(0).toUpperCase() + network.slice(1)}
    </span>
  );
}

// --- Section header ----------------------------------------------------------

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </div>
  );
}

// --- Copy button -------------------------------------------------------------

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className="btn-ghost px-2 py-1 text-xs"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
      }}
    >
      {label}
    </button>
  );
}

// --- Spinner -----------------------------------------------------------------

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-sol ${className}`}
      aria-hidden
    />
  );
}

// --- Banner (errors / warnings / info) --------------------------------------

const BANNER_STYLE = {
  error: 'border-error/30 bg-error/10 text-error',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-running/30 bg-running/10 text-running',
  success: 'border-success/30 bg-success/10 text-success',
} as const;

export function Banner({
  kind = 'error',
  children,
  className = '',
}: {
  kind?: keyof typeof BANNER_STYLE;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${BANNER_STYLE[kind]} ${className}`}>
      {children}
    </div>
  );
}

// --- Brand wordmark ----------------------------------------------------------

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-sol to-solPurple bg-clip-text font-bold text-transparent ${className}`}
    >
      Solana Studio
    </span>
  );
}

// --- Change markers ----------------------------------------------------------

export const CHANGE_MARK: Record<
  'created' | 'modified' | 'deleted',
  { mark: string; color: string; label: string }
> = {
  created: { mark: 'A', color: 'text-success', label: 'added' },
  modified: { mark: 'M', color: 'text-warning', label: 'modified' },
  deleted: { mark: 'D', color: 'text-error', label: 'deleted' },
};
