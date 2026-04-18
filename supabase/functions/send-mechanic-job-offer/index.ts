import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_EMAIL = "support@equiplink.org";
const FROM_NAME = "EquipLink";

function jobOfferHtml(
  mechanicName: string,
  machineType: string,
  machineModel: string,
  location: string,
  urgency: string,
  description: string,
  breakdownId: string,
): string {
  const urgencyColor = urgency === "critical" ? "#ef4444" : urgency === "high" ? "#f97316" : "#eab308";
  const appUrl = "https://equiplink.org";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Job Offer - EquipLink</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">
          <tr>
            <td style="background:#111111;padding:36px 40px 28px;border-bottom:1px solid #1f1f1f;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="font-size:22px;color:#111;">&#128295;</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;">Equip<span style="color:#facc15;">Link</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#ffffff;">New Job Offer, ${mechanicName}!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
                EquipLink admin has selected you for a breakdown repair job. Please open the app or visit the website to <strong style="color:#facc15;">accept or decline</strong> within 2 hours.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Machine</p>
                          <p style="margin:0;font-size:16px;color:#ffffff;font-weight:700;">${machineType} ${machineModel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Location</p>
                          <p style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">&#128205; ${location}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Urgency</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:${urgencyColor};">${urgency.toUpperCase()}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Description</p>
                          <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;">${description}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6;">
                Once you accept, the EquipLink admin will call you to coordinate. If you decline, the job will be offered to another technician.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:#facc15;border-radius:8px;padding:13px 32px;">
                    <a href="${appUrl}/breakdown/offers" style="color:#111111;font-size:15px;font-weight:700;text-decoration:none;">View &amp; Respond to Offer</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#4b5563;">Job ID: ${breakdownId.slice(0, 8).toUpperCase()}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
                This offer was sent by EquipLink dispatch. Contact us at <a href="mailto:${FROM_EMAIL}" style="color:#6b7280;">${FROM_EMAIL}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { breakdownId } = await req.json();
    if (!breakdownId) {
      return new Response(JSON.stringify({ error: "Missing breakdownId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: breakdown, error: bErr } = await db
      .from("breakdown_requests")
      .select("*, mechanic:profiles!breakdown_requests_assigned_mechanic_id_fkey(id, name, email, contact_email, contact_phone, phone)")
      .eq("id", breakdownId)
      .maybeSingle();

    if (bErr || !breakdown) {
      return new Response(JSON.stringify({ error: "Breakdown not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mechanic = breakdown.mechanic;
    if (!mechanic) {
      return new Response(JSON.stringify({ error: "No mechanic assigned" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mechanicEmail = mechanic.contact_email || mechanic.email;
    const mechanicName = mechanic.name || "Technician";

    await db.from("notifications").insert({
      user_id: mechanic.id,
      type: "breakdown_job_offer",
      title: "New Job Offer",
      message: `You have been selected for a ${breakdown.machine_type} repair at ${breakdown.location}. Open the app to accept or decline.`,
      data: { breakdown_id: breakdownId, urgency: breakdown.urgency },
    });

    let emailSent = false;
    if (RESEND_API_KEY && mechanicEmail) {
      const html = jobOfferHtml(
        mechanicName,
        breakdown.machine_type || "Machine",
        breakdown.machine_model || "",
        breakdown.location || "—",
        breakdown.urgency || "medium",
        breakdown.description || "",
        breakdownId,
      );

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [{ email: mechanicEmail, name: mechanicName }],
          subject: `New Job Offer: ${breakdown.machine_type} repair at ${breakdown.location}`,
          html,
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("Resend error:", await res.text());
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, notificationCreated: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-mechanic-job-offer error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
