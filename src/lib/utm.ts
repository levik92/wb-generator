/**
 * Forwards current UTM query params from window.location to any internal link.
 * Ensures Yandex.Metrika / Meta Pixel / Google Analytics see UTM on the
 * destination page (e.g. /auth?tab=signup?utm_source=...).
 */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export const withUtm = (path: string): string => {
  if (typeof window === 'undefined') return path;
  const search = window.location.search;
  if (!search) return path;

  const current = new URLSearchParams(search);
  const forward = new URLSearchParams();
  UTM_KEYS.forEach((k) => {
    const v = current.get(k);
    if (v) forward.set(k, v);
  });
  const q = forward.toString();
  if (!q) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}${q}`;
};
