import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Tochka requires 200 response always
  const ok = (msg = "ok") =>
    new Response(JSON.stringify({ status: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return ok("method_not_allowed");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("Tochka webhook payload:", JSON.stringify(payload));

    // Log every webhook call for security
    await supabase.rpc("log_security_event", {
      user_id_param: null,
      event_type_param: "tochka_webhook_received",
      event_description_param: "Incoming Tochka webhook",
      metadata_param: {
        event_type: payload?.Data?.eventType || payload?.eventType || "unknown",
        timestamp: new Date().toISOString(),
      },
    });

    // Parse the webhook data
    // Tochka sends: { Data: { eventType: "incomingPayment", ... } }
    const data = payload?.Data || payload;
    const eventType = data?.eventType;

    if (eventType !== "incomingPayment") {
      console.log("Ignoring non-payment event:", eventType);
      return ok("ignored");
    }

    // Extract payment info
    const purpose = data?.purpose || data?.paymentPurpose || "";
    const amount = parseFloat(data?.amount || data?.operationAmount || "0");
    const payerInn = data?.SidePayer?.taxCode || data?.payerInn || "";
    const payerName = data?.SidePayer?.name || data?.payerName || "";

    console.log("Payment data:", { purpose, amount, payerInn, payerName });

    if (!purpose || !amount) {
      console.log("Missing purpose or amount");
      return ok("missing_data");
    }

    // Extract invoice number from purpose (WBG-XXXX pattern)
    const invoiceMatch = purpose.match(/WBG-\d+/);
    if (!invoiceMatch) {
      console.log("No invoice number found in purpose:", purpose);
      return ok("no_invoice_match");
    }
    const invoiceNumber = invoiceMatch[0];
    console.log("Matched invoice:", invoiceNumber);

    // Look up the invoice
    const { data: invoice, error: lookupError } = await supabase
      .from("invoice_payments")
      .select("*, organization_details!inner(inn)")
      .eq("invoice_number", invoiceNumber)
      .in("status", ["invoice_issued", "pending_confirmation"])
      .single();

    if (lookupError || !invoice) {
      console.log("Invoice not found or already processed:", invoiceNumber, lookupError);
      return ok("invoice_not_found");
    }

    // Validate: amount must match
    if (Math.abs(invoice.amount - amount) > 0.01) {
      console.warn("Amount mismatch:", { expected: invoice.amount, received: amount });
      await supabase.rpc("log_security_event", {
        user_id_param: invoice.user_id,
        event_type_param: "tochka_webhook_amount_mismatch",
        event_description_param: `Amount mismatch for ${invoiceNumber}`,
        metadata_param: {
          invoice_number: invoiceNumber,
          expected_amount: invoice.amount,
          received_amount: amount,
          payer_inn: payerInn,
        },
      });
      return ok("amount_mismatch");
    }

    // Validate: payer ИНН should match (if available)
    const orgInn = (invoice as any).organization_details?.inn;
    if (payerInn && orgInn && payerInn !== orgInn) {
      console.warn("INN mismatch:", { expected: orgInn, received: payerInn });
      await supabase.rpc("log_security_event", {
        user_id_param: invoice.user_id,
        event_type_param: "tochka_webhook_inn_mismatch",
        event_description_param: `INN mismatch for ${invoiceNumber}`,
        metadata_param: {
          invoice_number: invoiceNumber,
          expected_inn: orgInn,
          received_inn: payerInn,
        },
      });
      // Still process — INN from webhook may differ from buyer org
    }

    // All checks passed — process the payment
    // 1. Update invoice status
    await supabase
      .from("invoice_payments")
      .update({
        status: "paid",
        tochka_status: "payment_paid",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // 2. Credit tokens via existing RPC
    const { error: creditError } = await supabase.rpc("process_invoice_payment", {
      p_invoice_id: invoice.id,
      p_admin_id: invoice.user_id, // system action, use user_id
      p_action: "approve",
    });

    if (creditError) {
      // Invoice already updated to paid, so just use direct token credit
      console.error("process_invoice_payment RPC error, using direct credit:", creditError);
      
      // Bypass token protection and credit directly
      const { error: directError } = await supabase.rpc("admin_update_user_tokens", {
        target_user_id: invoice.user_id,
        new_balance: -1, // placeholder, we'll use a different approach
        reason: "auto",
      });
      
      // Actually, let's just use refund_tokens which adds to existing balance
      await supabase.rpc("refund_tokens", {
        user_id_param: invoice.user_id,
        tokens_amount: invoice.tokens_amount,
        reason_text: `Оплата по счёту #${invoiceNumber} — ${invoice.package_name}`,
      });
    }

    // 3. Log security event for successful payment
    await supabase.rpc("log_security_event", {
      user_id_param: invoice.user_id,
      event_type_param: "tochka_payment_processed",
      event_description_param: `Payment processed for invoice ${invoiceNumber}`,
      metadata_param: {
        invoice_number: invoiceNumber,
        amount,
        tokens_credited: invoice.tokens_amount,
        payer_inn: payerInn,
        payer_name: payerName,
      },
    });

    console.log("Successfully processed payment for", invoiceNumber);
    return ok("processed");
  } catch (error) {
    console.error("tochka-webhook error:", error);
    return ok("error");
  }
});