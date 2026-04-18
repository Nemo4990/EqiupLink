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
      mechanic_id,
      quote_amount,
      quote_expires_at,
      machine_type,
      machine_model,
      location,
      urgency,
      owner_name,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: mechanic } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", mechanic_id)
      .maybeSingle();

    if (!mechanic) {
      return new Response(JSON.stringify({ error: "Mechanic not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiryDate = quote_expires_at
      ? new Date(quote_expires_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quote Sent to Owner — EquipLink</title>
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
                    <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Service Dispatch Platform</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:#10b981;color:#ffffff;font-weight:800;font-size:11px;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">QUOTE SENT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 0;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Your Quote Has Been Sent to the Owner</h1>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.5;">
                Hello ${mechanic.name || "Technician"}, the machine breakdown request has been quoted and your formal quotation has been sent to the owner for approval.
              </p>

              <!-- Quote Summary Card -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin-bottom:24px;">
                <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;">Job Details</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Machine</span><br/>
                      <span style="font-size:15px;font-weight:700;color:#111827;">${machine_type || "—"} ${machine_model || ""}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:10px;">
                      <span style="font-size:12px;color:#9ca3af;">Owner</span><br/>
                      <span style="font-size:15px;font-weight:600;color:#111827;">${owner_name || "—"}</span>
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
                </table>

                <!-- Quote Amount -->
                <div style="background:#111827;border-radius:8px;padding:16px 20px;margin-top:16px;display:flex;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="font-size:12px;color:#9ca3af;">Your Quote Amount</span><br/>
                        <span style="font-size:26px;font-weight:900;color:#facc15;">ETB ${(quote_amount || 0).toLocaleString()}</span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${expiryDate ? `
                <p style="margin:12px 0 0;font-size:12px;color:#ef4444;">
                  &#9888; Owner has until <strong>${expiryDate}</strong> to approve and pay.
                </p>` : ""}
              </div>

              <!-- Status Info -->
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin-bottom:32px;">
                <p style="margin:0;font-size:14px;color:#047857;line-height:1.5;">
                  <strong>What's next?</strong> Monitor your job offers in the app. Once the owner approves and pays, you'll receive a dispatch notification with the full site details and owner contact information.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;">
                This is a system-generated notification from EquipLink. All job dispatches are coordinated through the platform for your security and efficiency.
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

    if (RESEND_API_KEY && mechanic.email) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EquipLink <noreply@equiplink.com>",
            to: [mechanic.email],
            subject: `Quote Sent to Owner — ETB ${(quote_amount || 0).toLocaleString()} for ${machine_type || "job"}`,
            html: htmlEmail,
          }),
        });
        if (!emailRes.ok) {
          const emailErr = await emailRes.text();
          console.error("Resend API error:", emailErr);
        }
      } catch (emailErr) {
        console.error("Failed to send email to mechanic:", emailErr);
      }
    }

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
