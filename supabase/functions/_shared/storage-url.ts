/**
 * Rewrite Supabase Storage URLs to go through the regional reverse proxy
 * (api.wbgen.ru) so that users in regions where supabase.co is blocked can
 * still load generated images, uploaded photos, attachments, etc.
 *
 * Edge functions get the public URL via supabase.storage.getPublicUrl(), which
 * always uses the internal SUPABASE_URL (xguiyabpngjkavyosbza.supabase.co).
 * We rewrite the host before persisting the URL to the database.
 *
 * Override the proxy host with the STORAGE_PROXY_HOST env var if needed.
 */
const PROXY_HOST = Deno.env.get("STORAGE_PROXY_HOST") || "api.wbgen.ru";

export function toProxiedUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return url ?? "";
  if (!url.includes("/storage/v1/")) return url;
  if (url.includes(PROXY_HOST)) return url;
  return url.replace(/https?:\/\/[a-z0-9-]+\.supabase\.co/i, `https://${PROXY_HOST}`);
}
