import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inn } = await req.json();
    if (!inn || !/^\d{10,12}$/.test(inn)) {
      return new Response(JSON.stringify({ error: "Invalid INN" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tochkaToken = Deno.env.get("TOCHKA_API_TOKEN");
    if (!tochkaToken) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://enter.tochka.com/uapi/invoice/v1.0/counterparty/${inn}`, {
      headers: { Authorization: `Bearer ${tochkaToken}` },
    });

    if (!res.ok) {
      console.log("Counterparty not found for INN:", inn, res.status);
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const cp = data?.Data || data;

    // Normalize response
    const result = {
      found: true,
      name: cp?.secondSideName || cp?.name || "",
      kpp: cp?.kpp || "",
      legalAddress: cp?.legalAddress || cp?.legal_address || "",
      bankName: cp?.bankName || cp?.bank_name || "",
      bik: cp?.bik || "",
      checkingAccount: "",
      corrAccount: cp?.bankCorrAccount || cp?.corr_account || "",
    };

    // Parse accountId (format: "RS/BIK")
    const accId = cp?.accountId || cp?.account_id || "";
    if (accId.includes("/")) {
      result.checkingAccount = accId.split("/")[0];
      if (!result.bik) result.bik = accId.split("/")[1];
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lookup-counterparty error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
