import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      breakdown_id,
      owner_id,
      quote_amount,
      quote_expires_at,
      machine_type,
      machine_model,
      location,
      urgency,
      admin_note,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: owner } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", owner_id)
      .maybeSingle();

    if (!owner) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiryDate = quote_expires_at
      ? new Date(quote_expires_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    const quoteUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co/rest/v1", "").replace("supabase.co", "")}owner/quote/${breakdown_id}`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Service Quotation Ready — EquipLink</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:28px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;color:#facc15;letter-spacing:-0.5px;">Equip<span style="color:#ffffff;">Link</span></span>
                    <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Verified Service Dispatch Platform</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#facc15;color:#111827;font-weight:800;font-size:11px;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">QUOTATION READY</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 0;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Your Service Quotation is Ready</h1>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
                Hello ${owner.name || "there"}, a verified technician has reviewed your machine breakdown and a formal quotation has been prepared.
              </p>

              <!-- Quote Card -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin-bottom:24px;">
                <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Quotation Summary</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Machine</span><br/>
                      <span style="font-size:15px;font-weight:700;color:#111827;">${machine_type || "—"} ${machine_model || ""}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Location</span><br/>
                      <span style="font-size:15px;font-weight:600;color:#111827;">${location || "—"}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Urgency</span><br/>
                      <span style="font-size:14px;font-weight:700;color:#f59e0b;text-transform:uppercase;">${urgency || "—"}</span>
                    </td>
                  </tr>
                  ${admin_note ? `
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Admin Note</span><br/>
                      <span style="font-size:14px;color:#374151;">${admin_note}</span>
                    </td>
                  </tr>` : ""}
                </table>

                <!-- Total -->
                <div style="background:#111827;border-radius:8px;padding:16px 20px;margin-top:16px;display:flex;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="font-size:12px;color:#9ca3af;">Total Service Cost</span><br/>
                        <span style="font-size:26px;font-weight:900;color:#facc15;">ETB ${(quote_amount || 0).toLocaleString()}</span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${expiryDate ? `
                <p style="margin:12px 0 0;font-size:12px;color:#ef4444;">
                  &#9888; This quotation expires on <strong>${expiryDate}</strong>. Approve before it expires.
                </p>` : ""}
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="${quoteUrl}" style="display:inline-block;background:#facc15;color:#111827;font-weight:800;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                  Review &amp; Approve Quotation
                </a>
                <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Payment is deducted from your EquipLink wallet upon approval.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;">
                This is a system-generated notification from EquipLink. All dispatches are coordinated through the platform for your security and peace of mind.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY && owner.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EquipLink <noreply@equiplink.com>",
          to: [owner.email],
          subject: `Your Service Quotation is Ready — ETB ${(quote_amount || 0).toLocaleString()}`,
          html: htmlEmail,
        }),
      });
    }

    await supabase.from("notifications").insert({
      user_id: owner_id,
      type: "quote_ready",
      title: "Service Quotation Ready",
      message: `A quotation of ETB ${(quote_amount || 0).toLocaleString()} has been sent for your ${machine_type || "machine"} at ${location || "your site"}. Please review and approve to proceed.`,
      data: { breakdown_id, quote_amount },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
