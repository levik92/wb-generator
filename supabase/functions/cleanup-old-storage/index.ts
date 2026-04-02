import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: decode JWT to check role claim, or verify admin user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    
    // Try to decode JWT payload to check role
    let isServiceRole = false;
    try {
      const payloadB64 = token.split(".")[1];
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64));
        isServiceRole = payload.role === "service_role";
      }
    } catch { /* not a valid JWT */ }

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    console.log("Auth passed, starting cleanup...");

    const buckets = ["generated-cards", "product-images"];
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const batchSize = 100;
    let totalDeleted = 0;
    const results: Record<string, { deleted: number; errors: number }> = {};

    for (const bucket of buckets) {
      let deleted = 0;
      let errors = 0;
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        // List files in the bucket using storage API
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list("", {
            limit: batchSize,
            offset,
            sortBy: { column: "created_at", order: "asc" },
          });

        if (listError || !files || files.length === 0) {
          hasMore = false;
          break;
        }

        // Filter files older than cutoff
        const oldFiles = files.filter((f: any) => {
          if (!f.created_at) return false;
          return new Date(f.created_at) < new Date(cutoffDate);
        });

        if (oldFiles.length === 0) {
          // If no old files in this batch, all remaining are newer - stop
          hasMore = false;
          break;
        }

        const paths = oldFiles.map((f: any) => f.name);
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove(paths);

        if (removeError) {
          console.error(`Error removing batch from ${bucket}:`, removeError);
          errors += paths.length;
          offset += batchSize;
        } else {
          deleted += paths.length;
          // Don't increment offset since files were deleted
        }

        // Safety: stop early to avoid timeout (edge functions have ~60s limit)
        if (deleted + errors > 500) {
          hasMore = false;
        }
      }

      // Also handle subdirectories
      const { data: folders } = await supabase.storage
        .from(bucket)
        .list("", { limit: 1000 });

      if (folders) {
        for (const folder of folders) {
          if (folder.id === null && folder.name) {
            // It's a folder, list its contents
            let folderHasMore = true;
            let folderOffset = 0;

            while (folderHasMore) {
              const { data: subFiles } = await supabase.storage
                .from(bucket)
                .list(folder.name, {
                  limit: batchSize,
                  offset: folderOffset,
                  sortBy: { column: "created_at", order: "asc" },
                });

              if (!subFiles || subFiles.length === 0) {
                folderHasMore = false;
                break;
              }

              const oldSubFiles = subFiles.filter((f: any) => {
                if (!f.created_at) return false;
                return new Date(f.created_at) < new Date(cutoffDate);
              });

              if (oldSubFiles.length === 0) {
                folderHasMore = false;
                break;
              }

              const subPaths = oldSubFiles.map((f: any) => `${folder.name}/${f.name}`);
              const { error: subRemoveError } = await supabase.storage
                .from(bucket)
                .remove(subPaths);

              if (subRemoveError) {
                errors += subPaths.length;
                folderOffset += batchSize;
              } else {
                deleted += subPaths.length;
              }

              if (deleted + errors > 10000) {
                folderHasMore = false;
              }
            }
          }
        }
      }

      results[bucket] = { deleted, errors };
      totalDeleted += deleted;
    }

    console.log(`Cleanup complete. Total deleted: ${totalDeleted}`, results);

    return new Response(
      JSON.stringify({ totalDeleted, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Cleanup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
