import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TOCHKA_BASE = "https://enter.tochka.com/uapi";

async function fetchCustomerCode(token: string, accountId: string): Promise<string> {
  const res = await fetch(`${TOCHKA_BASE}/open-banking/v1.0/customers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch customers: ${res.status} ${text}`);
  }
  const data = await res.json();
  const customers = data?.Data?.Customer || data?.customers || [];
  for (const customer of customers) {
    const accounts = customer?.accounts || customer?.Accounts || [];
    for (const acc of accounts) {
      const id = acc?.accountId || acc?.account_id || "";
      if (id === accountId || id.startsWith(accountId.split("/")[0])) {
        return customer.customerCode || customer.customer_code;
      }
    }
    // Also check customerCode directly if no accounts match
    if (customer.customerCode || customer.customer_code) {
      // If only one customer, use it
      if (customers.length === 1) {
        return customer.customerCode || customer.customer_code;
      }
    }
  }
  throw new Error(`No customer found for account ${accountId}`);
}

async function lookupCounterparty(token: string, inn: string) {
  try {
    const res = await fetch(`${TOCHKA_BASE}/invoice/v1.0/counterparty/${inn}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.Data || data || null;
  } catch (e) {
    console.warn("Counterparty lookup failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const tochkaToken = Deno.env.get("TOCHKA_API_TOKEN");
    const tochkaAccountId = Deno.env.get("TOCHKA_ACCOUNT_ID");

    if (!tochkaToken || !tochkaAccountId) {
      console.error("Missing Tochka secrets");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { orgData, bankDetails, packageId, packageName, packagePrice, packageTokens } = body;

    if (!orgData?.name || !orgData?.inn || !packageId || !packageName || !packagePrice || !packageTokens) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch customerCode dynamically
    let customerCode: string;
    try {
      customerCode = await fetchCustomerCode(tochkaToken, tochkaAccountId);
      console.log("Resolved customerCode:", customerCode);
    } catch (e) {
      console.error("Failed to resolve customerCode:", e);
      return new Response(JSON.stringify({ error: "Ошибка конфигурации банка" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-fill buyer data from Tochka counterparty lookup
    const counterparty = await lookupCounterparty(tochkaToken, orgData.inn);
    if (counterparty) {
      console.log("Counterparty data:", JSON.stringify(counterparty));
      // User-provided data takes priority; fill only empty fields
      if (!orgData.kpp && counterparty.kpp) orgData.kpp = counterparty.kpp;
      if (!orgData.legal_address && counterparty.legalAddress) orgData.legal_address = counterparty.legalAddress;
      if (!orgData.name && counterparty.secondSideName) orgData.name = counterparty.secondSideName;
      if (!bankDetails?.bankName && counterparty.bankName) {
        bankDetails.bankName = counterparty.bankName;
      }
      if (!bankDetails?.bik && counterparty.bik) {
        bankDetails.bik = counterparty.bik;
      }
      if (!bankDetails?.checkingAccount && counterparty.accountId) {
        // accountId is "RS/BIK" format
        const parts = counterparty.accountId?.split("/");
        if (parts?.length >= 1) bankDetails.checkingAccount = parts[0];
      }
      if (!bankDetails?.corrAccount && counterparty.bankCorrAccount) {
        bankDetails.corrAccount = counterparty.bankCorrAccount;
      }
    }

    // 1. Upsert organization details
    const { data: orgRecord, error: orgError } = await supabase
      .from("organization_details")
      .upsert(
        {
          user_id: userId,
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
      user_id: userId,
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

    const buyerAccountId =
      bankDetails?.checkingAccount && bankDetails?.bik
        ? `${bankDetails.checkingAccount}/${bankDetails.bik}`
        : undefined;

    // Determine buyer type: 12-digit INN = IP, 10-digit = company
    const buyerType = orgData.inn.length === 12 ? "ip" : "company";
    const priceStr = String(packagePrice);

    const tochkaBody = {
      Data: {
        accountId: tochkaAccountId,
        customerCode,
        SecondSide: {
          taxCode: orgData.inn,
          type: buyerType,
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
                unitCode: "услуга.",
                ndsKind: "without_nds",
                price: priceStr,
                quantity: 1,
                totalAmount: priceStr,
              },
            ],
            totalAmount: priceStr,
            number: invoiceNumber,
            comment: "Без НДС",
            paymentExpiryDate: expiryStr,
          },
        },
      },
    };

    console.log("Calling Tochka API:", JSON.stringify(tochkaBody));

    const tochkaRes = await fetch(`${TOCHKA_BASE}/invoice/v1.0/bills`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tochkaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tochkaBody),
    });

    const tochkaData = await tochkaRes.json();
    console.log("Tochka response:", JSON.stringify(tochkaData));

    if (!tochkaRes.ok) {
      console.error("Tochka API error:", tochkaData);
      await supabase
        .from("invoice_payments")
        .update({ tochka_status: "api_error", updated_at: new Date().toISOString() })
        .eq("invoice_number", invoiceNumber);

      return new Response(
        JSON.stringify({
          success: true,
          invoiceNumber,
          tochkaError: true,
          message: "Счёт создан, но не удалось отправить в банк.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Save Tochka document ID
    const documentId = tochkaData?.Data?.documentId || tochkaData?.documentId || null;
    if (documentId) {
      await supabase
        .from("invoice_payments")
        .update({ tochka_document_id: documentId, tochka_status: "payment_waiting", updated_at: new Date().toISOString() })
        .eq("invoice_number", invoiceNumber);
    }

    // 6. Log security event
    await supabase.rpc("log_security_event", {
      user_id_param: userId,
      event_type_param: "invoice_created_tochka",
      event_description_param: `Invoice ${invoiceNumber} created via Tochka API`,
      metadata_param: { invoice_number: invoiceNumber, amount: packagePrice, package: packageName, tochka_document_id: documentId },
    });

    return new Response(
      JSON.stringify({ success: true, invoiceNumber, documentId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-tochka-invoice error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
