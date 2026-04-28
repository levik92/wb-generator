/**
 * Storage URL helpers.
 *
 * Rewrites direct Supabase Storage URLs (`*.supabase.co/storage/v1/...`) to go
 * through the regional reverse proxy `api.wbgen.ru`. This is critical for users
 * in regions where supabase.co is blocked — generation works (uses the proxy),
 * but image URLs saved directly from edge functions or older records still
 * point to supabase.co and fail to load.
 *
 * The rewrite is defensive: it works on any URL string, returns it unchanged
 * if it doesn't match a Supabase storage pattern, and is idempotent.
 */
import { supabase } from "@/integrations/supabase/client";
import { supabaseUrl } from "@/config/runtime";

const PROXY_HOST = "api.wbgen.ru";

/** Rewrite *.supabase.co storage URLs to go through the reverse proxy. */
export function rewriteStorageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return url ?? "";
  // Only touch storage URLs.
  if (!url.includes("/storage/v1/")) return url;
  // Already proxied.
  if (url.includes(PROXY_HOST)) return url;
  // Replace any *.supabase.co host with the proxy.
  return url.replace(/https?:\/\/[a-z0-9-]+\.supabase\.co/i, `https://${PROXY_HOST}`);
}

/**
 * Drop-in replacement for `supabase.storage.from(bucket).getPublicUrl(path)`
 * that returns a URL routed through the regional proxy.
 */
export function getProxiedPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return rewriteStorageUrl(data?.publicUrl ?? "");
}

export { PROXY_HOST, supabaseUrl };
