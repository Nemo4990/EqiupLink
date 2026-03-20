import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_EMAIL = "support@equiplink.org";
const FROM_NAME = "EquipLink";
const ADMIN_EMAIL = "support@equiplink.org";

const ROLE_LABELS: Record<string, string> = {
  owner: "Equipment Owner",
  mechanic: "Mechanic / Technician",
  supplier: "Spare Parts Supplier",
  rental_provider: "Equipment Rental Provider",
};

function welcomeHtml(name: string, email: string, role: string): string {
  const roleLabel = ROLE_LABELS[role] ?? role;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to EquipLink</title>
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
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;">Welcome, ${name}!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
                Your EquipLink account has been created successfully. You're now part of the largest heavy equipment service marketplace.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Account Details</p>
                    <p style="margin:0 0 12px;font-size:15px;color:#ffffff;font-weight:600;">${email}</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Registered As</p>
                    <p style="margin:0;font-size:15px;color:#facc15;font-weight:600;">${roleLabel}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;line-height:1.6;">
                To activate your account, please verify your email address by clicking the link in the separate verification email we sent you.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
                Didn't receive the verification email? Check your spam folder or contact us at <a href="mailto:${FROM_EMAIL}" style="color:#facc15;text-decoration:none;">${FROM_EMAIL}</a>.
              </p>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:8px;padding:12px 28px;">
                    <a href="https://equiplink.org/login" style="color:#111111;font-size:15px;font-weight:700;text-decoration:none;">Go to EquipLink</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
                This email was sent from <a href="mailto:${FROM_EMAIL}" style="color:#6b7280;text-decoration:none;">${FROM_EMAIL}</a>. If you did not create an EquipLink account, please ignore this email.
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

function adminNotificationHtml(name: string, email: string, role: string): string {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const timestamp = new Date().toUTCString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>New User Registration</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222;">
          <tr>
            <td style="background:#111111;padding:28px 40px;border-bottom:1px solid #1f1f1f;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="font-size:22px;color:#111;">&#128295;</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;">Equip<span style="color:#facc15;">Link</span></span>
                    <span style="display:block;font-size:12px;color:#6b7280;margin-top:2px;">Admin Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 28px;">
              <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;">New User Registered</h2>
              <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">A new user has created an account on EquipLink.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Full Name</p>
                          <p style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">${name}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Email Address</p>
                          <p style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:14px;border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Account Type</p>
                          <p style="margin:0;font-size:15px;color:#facc15;font-weight:600;">${roleLabel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #2a2a2a;padding-top:14px;">
                          <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Registered At</p>
                          <p style="margin:0;font-size:14px;color:#9ca3af;">${timestamp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#4b5563;">This is an automated notification from the EquipLink platform.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, toName: string, subject: string, html: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [{ email: to, name: toName }],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", body);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [welcomeOk, adminOk] = await Promise.all([
      sendEmail(
        email,
        name,
        "Welcome to EquipLink - Please verify your email",
        welcomeHtml(name, email, role),
      ),
      sendEmail(
        ADMIN_EMAIL,
        "EquipLink Admin",
        `New user registration: ${name} (${ROLE_LABELS[role] ?? role})`,
        adminNotificationHtml(name, email, role),
      ),
    ]);

    return new Response(
      JSON.stringify({ success: true, welcomeSent: welcomeOk, adminNotified: adminOk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-registration-emails error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
