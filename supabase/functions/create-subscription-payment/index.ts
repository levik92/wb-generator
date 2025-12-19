import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const yookassaShopId = Deno.env.get("YOOKASSA_SHOP_ID");
    const yookassaSecretKey = Deno.env.get("YOOKASSA_SECRET_KEY");

    if (!yookassaShopId || !yookassaSecretKey) {
      throw new Error("YooKassa credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { packageId, packageName, amount } = await req.json();

    if (!packageId || !packageName || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscription package details
    const { data: packageData, error: packageError } = await supabase
      .from("subscription_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (packageError || !packageData) {
      return new Response(
        JSON.stringify({ error: "Package not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique payment ID
    const idempotenceKey = crypto.randomUUID();

    // Get base URL for return
    const baseUrl = req.headers.get("origin") || "https://wbgen.ru";

    // Create YooKassa payment
    const yookassaResponse = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        "Authorization": `Basic ${btoa(`${yookassaShopId}:${yookassaSecretKey}`)}`,
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: "RUB",
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: `${baseUrl}/dashboard?payment=success&type=subscription`,
        },
        description: `Подписка "${packageName}"`,
        metadata: {
          user_id: user.id,
          package_id: packageId,
          package_name: packageName,
          tokens_per_month: packageData.tokens_per_month,
          duration_days: packageData.duration_days,
          payment_type: "subscription",
        },
      }),
    });

    if (!yookassaResponse.ok) {
      const errorData = await yookassaResponse.json();
      console.error("YooKassa error:", errorData);
      return new Response(
        JSON.stringify({ error: "Payment creation failed", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentData = await yookassaResponse.json();

    // Store payment record
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      yookassa_payment_id: paymentData.id,
      amount: amount,
      tokens_amount: packageData.tokens_per_month,
      package_name: packageName,
      status: "pending",
      currency: "RUB",
      metadata: {
        payment_type: "subscription",
        package_id: packageId,
        duration_days: packageData.duration_days,
        can_download: packageData.can_download,
        features: packageData.features,
      },
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        payment_url: paymentData.confirmation.confirmation_url,
        payment_id: paymentData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
