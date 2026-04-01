/**
 * Centralized edge-function runtime configuration.
 * All values come from Deno.env with safe fallbacks only for public URLs.
 * Secrets have NO fallbacks — they must be set in the environment.
 */

// ── Core Supabase ──────────────────────────────────────────────
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// ── Public URLs (safe fallbacks for hosted env) ────────────────
export const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://wbgen.ru";
export const SUPPORT_TELEGRAM_URL = Deno.env.get("SUPPORT_TELEGRAM_URL") || "https://t.me/wbgen_support";
export const TELEGRAM_GROUP_URL = Deno.env.get("TELEGRAM_GROUP_URL") || "https://t.me/wbgen_official";

/**
 * Base URL for setting up Telegram webhook.
 * Falls back to constructing from SUPABASE_URL.
 */
export const TELEGRAM_WEBHOOK_BASE_URL =
  Deno.env.get("TELEGRAM_WEBHOOK_BASE_URL") || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "");

// ── AI providers ───────────────────────────────────────────────
export const DEFAULT_AI_PROVIDER = Deno.env.get("DEFAULT_AI_PROVIDER") || "direct";
export const SUPPORT_AI_PROVIDER = Deno.env.get("SUPPORT_AI_PROVIDER") || "";
export const LOOKUP_AI_PROVIDER = Deno.env.get("LOOKUP_AI_PROVIDER") || "lovable";

// ── API keys (no fallbacks — must be configured) ───────────────
export const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
export const POLZA_AI_API_KEY = Deno.env.get("POLZA_AI_API_KEY") || "";
export const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || "";
export const GOOGLE_GEMINI_API_KEY_2 = Deno.env.get("GOOGLE_GEMINI_API_KEY_2") || "";
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
export const YOOKASSA_SECRET_KEY = Deno.env.get("YOOKASSA_SECRET_KEY") || "";
export const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

// ── Feature flags ──────────────────────────────────────────────
export const SUPPORT_AI_ENABLED = Deno.env.get("SUPPORT_AI_ENABLED") !== "false";
