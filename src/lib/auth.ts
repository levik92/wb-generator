import { supabase } from "@/integrations/supabase/client";

const clearSupabaseAuthStorage = () => {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        keysToRemove.push(key);
      }
    }

    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
      try {
        sessionStorage.removeItem(key);
      } catch {}
    });
  } catch (error) {
    console.error("Failed to clear auth storage:", error);
  }
};

export const forceSignOut = async (redirectTo = "/auth") => {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Sign out error:", error);
  } finally {
    clearSupabaseAuthStorage();
    window.location.replace(redirectTo);
  }
};
