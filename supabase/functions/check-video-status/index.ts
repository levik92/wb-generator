import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateKlingJWT(): Promise<string> {
  const ak = Deno.env.get("KLING_ACCESS_KEY");
  const sk = Deno.env.get("KLING_SECRET_KEY");

  if (!ak || !sk) {
    throw new Error("KLING_ACCESS_KEY or KLING_SECRET_KEY not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: ak,
    exp: now + 1800,
    nbf: now - 5,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sk),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${signatureB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job and verify ownership
    const { data: job, error: jobError } = await adminClient
      .from("video_generation_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", userId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed or failed, return current state
    if (job.status === "completed" || job.status === "failed") {
      return new Response(
        JSON.stringify({
          status: job.status,
          video_url: job.result_video_url,
          error_message: job.error_message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job.kling_task_id) {
      return new Response(JSON.stringify({ error: "No Kling task ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll Kling API
    const klingJwt = await generateKlingJWT();
    const klingResponse = await fetch(
      `https://api.klingai.com/v1/videos/image2video/${job.kling_task_id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${klingJwt}` },
      }
    );

    const klingResult = await klingResponse.json();
    console.log("Kling status response:", JSON.stringify(klingResult));

    if (klingResult.code !== 0) {
      // API error — refund tokens and mark failed
      await adminClient
        .from("video_generation_jobs")
        .update({
          status: "failed",
          error_message: klingResult.message || "Kling API error",
        })
        .eq("id", job_id);

      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: job.tokens_cost,
        reason_text: `Ошибка видеогенерации: ${klingResult.message || "Unknown"}`,
      });

      return new Response(
        JSON.stringify({
          status: "failed",
          error_message: klingResult.message || "Kling API error",
          refunded: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskStatus = klingResult.data?.task_status;
    const taskStatusMsg = klingResult.data?.task_status_msg;

    if (taskStatus === "succeed") {
      const videoUrl =
        klingResult.data?.task_result?.videos?.[0]?.url || null;

      await adminClient
        .from("video_generation_jobs")
        .update({
          status: "completed",
          result_video_url: videoUrl,
        })
        .eq("id", job_id);

      return new Response(
        JSON.stringify({ status: "completed", video_url: videoUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (taskStatus === "failed") {
      const errorMsg = taskStatusMsg || "Video generation failed";

      await adminClient
        .from("video_generation_jobs")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", job_id);

      await adminClient.rpc("refund_tokens", {
        user_id_param: userId,
        tokens_amount: job.tokens_cost,
        reason_text: `Ошибка видеогенерации: ${errorMsg}`,
      });

      return new Response(
        JSON.stringify({ status: "failed", error_message: errorMsg, refunded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Still processing
    return new Response(
      JSON.stringify({ status: "processing" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-video-status:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
