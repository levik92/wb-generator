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

    // Auth: verify service_role JWT or admin user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    
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

    console.log("Auth passed, starting storage cleanup via Storage API...");

    const buckets = ["generated-cards", "product-images", "generation-images"];
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const BATCH_SIZE = 1000;
    const MAX_TOTAL = 5000; // per invocation to stay within edge function time limits
    let totalDeleted = 0;
    let totalRemaining = 0;
    const results: Record<string, { deleted: number; errors: number; remaining: number }> = {};

    for (const bucket of buckets) {
      let deleted = 0;
      let errors = 0;

      // Use SQL SELECT on storage.objects to get old file paths (read is allowed)
      const { data: countData } = await supabase.rpc("exec_sql_readonly" as any, {}) // not available
        .catch(() => ({ data: null }));
      
      // Query old objects via storage.objects using postgrest
      // storage.objects is accessible via service role
      let hasMore = true;
      
      while (hasMore && (totalDeleted + deleted) < MAX_TOTAL) {
        // Fetch a batch of old object names from storage.objects
        const { data: oldObjects, error: queryError } = await supabase
          .from("objects" as any)
          .select("name")
          .eq("bucket_id", bucket)
          .lt("created_at", cutoffDate)
          .order("created_at", { ascending: true })
          .limit(BATCH_SIZE);

        if (queryError) {
          // If we can't query storage.objects directly, fall back to storage API list
          console.log(`Cannot query storage.objects for ${bucket}, falling back to list API: ${queryError.message}`);
          
          // Fallback: use storage list API with folder traversal
          await cleanupBucketViaListApi(supabase, bucket, cutoffDate, BATCH_SIZE, MAX_TOTAL - totalDeleted - deleted, 
            (d, e) => { deleted += d; errors += e; });
          hasMore = false;
          break;
        }

        if (!oldObjects || oldObjects.length === 0) {
          hasMore = false;
          break;
        }

        const paths = oldObjects.map((obj: any) => obj.name);
        
        // Delete via Storage API (this is the correct way)
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove(paths);

        if (removeError) {
          console.error(`Error removing batch from ${bucket}:`, removeError);
          errors += paths.length;
        } else {
          deleted += paths.length;
          console.log(`Deleted ${paths.length} files from ${bucket}, total: ${deleted}`);
        }

        // If we got fewer than BATCH_SIZE, we're done
        if (paths.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      // Count remaining old files
      const { count: remainingCount } = await supabase
        .from("objects" as any)
        .select("*", { count: "exact", head: true })
        .eq("bucket_id", bucket)
        .lt("created_at", cutoffDate)
        .catch(() => ({ count: 0 })) as any;

      const remaining = remainingCount || 0;
      totalRemaining += remaining;

      results[bucket] = { deleted, errors, remaining };
      totalDeleted += deleted;
    }

    const hasMore = totalRemaining > 0;
    console.log(`Cleanup complete. Deleted: ${totalDeleted}, Remaining: ${totalRemaining}`, results);

    return new Response(
      JSON.stringify({ totalDeleted, totalRemaining, has_more: hasMore, results }),
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

/**
 * Fallback: clean up bucket using the Storage list API when storage.objects is not queryable.
 * Traverses root and one level of subdirectories.
 */
async function cleanupBucketViaListApi(
  supabase: any,
  bucket: string,
  cutoffDate: string,
  batchSize: number,
  maxDelete: number,
  onProgress: (deleted: number, errors: number) => void
) {
  let totalDeleted = 0;

  const processFolder = async (folder: string) => {
    let offset = 0;
    while (totalDeleted < maxDelete) {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit: batchSize,
          offset,
          sortBy: { column: "created_at", order: "asc" },
        });

      if (error || !files || files.length === 0) break;

      // Separate subfolders from files
      const subFolders = files.filter((f: any) => f.id === null && f.name);
      const realFiles = files.filter((f: any) => f.id !== null);

      // Filter old files
      const oldFiles = realFiles.filter((f: any) => {
        if (!f.created_at) return false;
        return new Date(f.created_at) < new Date(cutoffDate);
      });

      if (oldFiles.length > 0) {
        const paths = oldFiles.map((f: any) => 
          folder ? `${folder}/${f.name}` : f.name
        );
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove(paths);

        if (removeError) {
          onProgress(0, paths.length);
        } else {
          totalDeleted += paths.length;
          onProgress(paths.length, 0);
        }
      }

      // Recurse into subfolders (one level deep from root)
      if (folder === "") {
        for (const sf of subFolders) {
          if (totalDeleted >= maxDelete) break;
          await processFolder(sf.name);
        }
      }

      // If no old files found among real files, remaining are newer — stop this folder
      if (oldFiles.length === 0 && realFiles.length > 0) break;
      
      // If we deleted files, don't increment offset (items shifted)
      // If we didn't delete, move forward
      if (oldFiles.length === 0) {
        offset += files.length;
      }

      if (files.length < batchSize) break;
    }
  };

  await processFolder("");
}
