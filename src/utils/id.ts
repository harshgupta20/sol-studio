// Small id helpers for client-only entities (plan steps, activity items, tabs).
// Uses crypto.randomUUID when available, else a compact random fallback.

export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${rnd}` : rnd;
}
