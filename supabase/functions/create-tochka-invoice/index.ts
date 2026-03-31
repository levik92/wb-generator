import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TOCHKA_API_URL = "https://enter.tochka.com/uapi/invoice/v1.0/bills";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tochkaToken = Deno.env.get("TOCHKA_API_TOKEN");
    const tochkaAccountId = Deno.env.get("TOCHKA_ACCOUNT_ID");
    const tochkaCustomerCode = tochkaAccountId; // customerCode can be derived or same

    if (!tochkaToken || !tochkaAccountId) {
      console.error("Missing Tochka secrets");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create authenticated supabase client to verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      orgData,
      bankDetails,
      packageId,
      packageName,
      packagePrice,
      packageTokens,
    } = body;

    // Validate required fields
    if (!orgData?.name || !orgData?.inn || !packageId || !packageName || !packagePrice || !packageTokens) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Upsert organization details
    const { data: orgRecord, error: orgError } = await supabase
      .from("organization_details")
      .upsert(
        {
          user_id: user.id,
          inn: orgData.inn,
          name: orgData.name,
          kpp: orgData.kpp || null,
          ogrn: orgData.ogrn || null,
          legal_address: orgData.legal_address || null,
          director_name: orgData.director_name || null,
          bank_name: bankDetails?.bankName || null,
          bik: bankDetails?.bik || null,
          checking_account: bankDetails?.checkingAccount || null,
          correspondent_account: bankDetails?.corrAccount || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (orgError) {
      console.error("Org upsert error:", orgError);
      throw new Error("Failed to save organization details");
    }

    // 2. Generate invoice number
    let invoiceNum = `${Date.now().toString().slice(-6)}`;
    const { data: seqData, error: seqError } = await supabase.rpc("nextval_invoice_number");
    if (!seqError && seqData) {
      invoiceNum = String(seqData);
    }
    const invoiceNumber = `WBG-${invoiceNum}`;
    const paymentPurpose = `Оплата за пополнение тарифа "${packageName}" в сервисе WBGen. Счёт ${invoiceNumber}. Без НДС.`;

    // 3. Create invoice record in DB
    const { error: invError } = await supabase.from("invoice_payments").insert({
      user_id: user.id,
      organization_id: orgRecord.id,
      package_id: packageId,
      package_name: packageName,
      amount: packagePrice,
      tokens_amount: packageTokens,
      invoice_number: invoiceNumber,
      payment_purpose: paymentPurpose,
      status: "invoice_issued",
    });

    if (invError) {
      console.error("Invoice insert error:", invError);
      throw new Error("Failed to create invoice record");
    }

    // 4. Call Tochka API to create the bill
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 5);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    // Build buyer's accountId from bank details (RS/BIK format)
    const buyerAccountId =
      bankDetails?.checkingAccount && bankDetails?.bik
        ? `${bankDetails.checkingAccount}/${bankDetails.bik}`
        : undefined;

    const tochkaBody = {
      Data: {
        accountId: tochkaAccountId,
        customerCode: tochkaCustomerCode,
        SecondSide: {
          taxCode: orgData.inn,
          type: orgData.inn.length === 12 ? "individual" : "company",
          secondSideName: orgData.name,
          ...(orgData.kpp && { kpp: orgData.kpp }),
          ...(orgData.legal_address && { legalAddress: orgData.legal_address }),
          ...(buyerAccountId && { accountId: buyerAccountId }),
          ...(bankDetails?.bankName && { bankName: bankDetails.bankName }),
          ...(bankDetails?.corrAccount && { bankCorrAccount: bankDetails.corrAccount }),
        },
        Content: {
          Invoice: {
            Positions: [
              {
                positionName: `Пополнение тарифа "${packageName}" в сервисе WBGen`,
                unitCode: "услуга",
                ndsKind: "without_nds",
                price: packagePrice,
                quantity: 1,
                totalAmount: packagePrice,
              },
            ],
            totalAmount: packagePrice,
            number: invoiceNumber,
            comment: "Без НДС",
            paymentExpiryDate: expiryStr,
          },
        },
      },
    };

    console.log("Calling Tochka API with body:", JSON.stringify(tochkaBody));

    const tochkaRes = await fetch(TOCHKA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tochkaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tochkaBody),
    });

    const tochkaData = await tochkaRes.json();
    console.log("Tochka API response:", JSON.stringify(tochkaData));

    if (!tochkaRes.ok) {
      console.error("Tochka API error:", tochkaData);
      // Still return success since invoice was created in our DB
      // Just log the Tochka error
      await supabase
        .from("invoice_payments")
        .update({
          tochka_status: "api_error",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_number", invoiceNumber);

      return new Response(
        JSON.stringify({
          success: true,
          invoiceNumber,
          tochkaError: true,
          message: "Счёт создан, но не удалось отправить в банк. Свяжитесь с поддержкой.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Save Tochka document ID
    const documentId = tochkaData?.Data?.documentId || tochkaData?.documentId || null;
    if (documentId) {
      await supabase
        .from("invoice_payments")
        .update({
          tochka_document_id: documentId,
          tochka_status: "payment_waiting",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_number", invoiceNumber);
    }

    // 6. Log security event
    await supabase.rpc("log_security_event", {
      user_id_param: user.id,
      event_type_param: "invoice_created_tochka",
      event_description_param: `Invoice ${invoiceNumber} created via Tochka API`,
      metadata_param: {
        invoice_number: invoiceNumber,
        amount: packagePrice,
        package: packageName,
        tochka_document_id: documentId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoiceNumber,
        documentId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-tochka-invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});