/**
 * Centralized frontend runtime configuration.
 * All runtime-variable values come from VITE_* env vars with safe fallbacks
 * for backward compatibility with the hosted (Lovable) environment.
 */

export const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL || "https://xguiyabpngjkavyosbza.supabase.co";

export const supabasePublishableKey: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndWl5YWJwbmdqa2F2eW9zYnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjcwMDEsImV4cCI6MjA3MTcwMzAwMX0.RrDztNYkAy0-PMb4j4A9XG28hROv9PsMw9EyG8dFcco";

export const supabaseProjectId: string =
  import.meta.env.VITE_SUPABASE_PROJECT_ID || "xguiyabpngjkavyosbza";

export const publicSiteUrl: string =
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://wbgen.ru";

export const supportTelegramUrl: string =
  import.meta.env.VITE_SUPPORT_TELEGRAM_URL || "https://t.me/wbgen_support";

export const telegramGroupUrl: string =
  import.meta.env.VITE_TELEGRAM_GROUP_URL || "https://t.me/wbgen_official";
