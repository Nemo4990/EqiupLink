import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_EMAIL = "support@equiplink.org";
const FROM_NAME = "EquipLink";
const BASE_URL = "https://www.equiplink.org";

const ROLE_LABELS: Record<string, string> = {
  owner: "Equipment Owner",
  mechanic: "Mechanic / Technician",
  supplier: "Spare Parts Supplier",
  rental_provider: "Equipment Rental Provider",
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function verificationEmailHtml(name: string, verificationLink: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your EquipLink account</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222222;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f1f;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;">
                    &#128295;
                  </td>
                  <td style="padding-left:12px;font-size:22px;font-weight:800;color:#ffffff;">
                    Equip<span style="color:#facc15;">Link</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">
                Hi ${firstName}, verify your email
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.65;">
                Thanks for joining EquipLink — the heavy equipment service marketplace. Click the button below to verify your email address and activate your account.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#facc15;border-radius:10px;">
                    <a href="${verificationLink}"
                       style="display:inline-block;padding:14px 36px;color:#111111;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.01em;">
                      Verify My Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border-radius:10px;margin-bottom:28px;border-left:3px solid #facc15;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                      <strong style="color:#facc15;">This link expires in 1 hour.</strong>
                      After that, you'll need to request a new verification email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;">
                <a href="${verificationLink}" style="color:#facc15;text-decoration:none;">${verificationLink}</a>
              </p>

              <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                If you didn't create an EquipLink account, you can safely ignore this email. Your email address will not be used without verification.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 40px;border-top:1px solid #1f1f1f;background:#0d0d0d;">
              <p style="margin:0;font-size:12px;color:#374151;line-height:1.6;">
                Sent by <a href="mailto:${FROM_EMAIL}" style="color:#4b5563;text-decoration:none;">${FROM_EMAIL}</a>
                &nbsp;&bull;&nbsp;
                <a href="${BASE_URL}" style="color:#4b5563;text-decoration:none;">www.equiplink.org</a>
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

function welcomeEmailHtml(name: string, email: string, role: string): string {
  const roleLabel = ROLE_LABELS[role] ?? role;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to EquipLink</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222222;max-width:560px;width:100%;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f1f;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;">&#128295;</td>
                  <td style="padding-left:12px;font-size:22px;font-weight:800;color:#ffffff;">Equip<span style="color:#facc15;">Link</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;">Welcome, ${name}!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.65;">
                Your EquipLink account has been created. You're joining the largest heavy equipment service marketplace — check your inbox for a separate verification email to activate your account.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Email</p>
                    <p style="margin:0 0 14px;font-size:14px;color:#ffffff;font-weight:600;">${email}</p>
                    <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Account Type</p>
                    <p style="margin:0;font-size:14px;color:#facc15;font-weight:600;">${roleLabel}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                Questions? Email us at <a href="mailto:${FROM_EMAIL}" style="color:#9ca3af;text-decoration:none;">${FROM_EMAIL}</a>
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
<head><meta charset="UTF-8" /><title>New User Registration - EquipLink</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:16px;overflow:hidden;border:1px solid #222222;max-width:560px;width:100%;">
          <tr>
            <td style="padding:28px 40px 20px;border-bottom:1px solid #1f1f1f;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;">&#128295;</td>
                  <td style="padding-left:12px;">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;">Equip<span style="color:#facc15;">Link</span></span>
                    <span style="display:block;font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.06em;">Admin Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 32px;">
              <h2 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#ffffff;">New User Registered</h2>
              <p style="margin:0 0 22px;font-size:14px;color:#9ca3af;">A new user has created an account on EquipLink.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Full Name</p>
                    <p style="margin:0 0 14px;font-size:15px;color:#ffffff;font-weight:600;">${name}</p>
                    <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Email Address</p>
                    <p style="margin:0 0 14px;font-size:15px;color:#ffffff;font-weight:600;">${email}</p>
                    <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Account Type</p>
                    <p style="margin:0 0 14px;font-size:15px;color:#facc15;font-weight:600;">${roleLabel}</p>
                    <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Registered At (UTC)</p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;">${timestamp}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaResend(to: string, toName: string, subject: string, html: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
    return { ok: false, error: body };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/verify-email/, "") || "/";

  try {
    // ─── POST /verify-email/send ─────────────────────────────────────────────
    if (req.method === "POST" && path === "/send") {
      const { userId, name, email, role } = await req.json();
      if (!userId || !name || !email || !role) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.from("email_verifications").delete().eq("user_id", userId).is("used_at", null);

      const { error: insertErr } = await db.from("email_verifications").insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt,
      });
      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed to create verification token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verificationLink = `${BASE_URL}/verify-email?token=${token}`;

      const [verifyResult, welcomeResult, adminResult] = await Promise.all([
        sendViaResend(email, name, "Verify your EquipLink account", verificationEmailHtml(name, verificationLink), RESEND_API_KEY),
        sendViaResend(email, name, "Welcome to EquipLink", welcomeEmailHtml(name, email, role), RESEND_API_KEY),
        sendViaResend("support@equiplink.org", "EquipLink Admin", `New registration: ${name} (${ROLE_LABELS[role] ?? role})`, adminNotificationHtml(name, email, role), RESEND_API_KEY),
      ]);

      if (!verifyResult.ok) {
        console.error("Verification email failed:", verifyResult.error);
      }

      return new Response(JSON.stringify({ success: true, emailSent: verifyResult.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST /verify-email/resend ────────────────────────────────────────────
    if (req.method === "POST" && path === "/resend") {
      const { userId, name, email } = await req.json();
      if (!userId || !name || !email) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recent } = await db
        .from("email_verifications")
        .select("created_at")
        .eq("user_id", userId)
        .is("used_at", null)
        .gte("created_at", tenMinutesAgo)
        .maybeSingle();

      if (recent) {
        return new Response(JSON.stringify({ error: "Please wait at least 10 minutes before requesting another verification email." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await db.from("email_verifications").delete().eq("user_id", userId).is("used_at", null);

      const { error: insertErr } = await db.from("email_verifications").insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt,
      });
      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed to create verification token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verificationLink = `${BASE_URL}/verify-email?token=${token}`;
      const result = await sendViaResend(email, name, "Verify your EquipLink account", verificationEmailHtml(name, verificationLink), RESEND_API_KEY);

      if (!result.ok) {
        return new Response(JSON.stringify({ error: "Failed to send verification email" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET /verify-email/verify?token=... ──────────────────────────────────
    if (req.method === "GET" && path === "/verify") {
      const token = url.searchParams.get("token");
      if (!token) {
        return Response.redirect(`${BASE_URL}/error?reason=missing_token`, 302);
      }

      const { data: record, error: fetchErr } = await db
        .from("email_verifications")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (fetchErr || !record) {
        return Response.redirect(`${BASE_URL}/error?reason=invalid_token`, 302);
      }

      if (record.used_at) {
        return Response.redirect(`${BASE_URL}/error?reason=already_used`, 302);
      }

      if (new Date(record.expires_at) < new Date()) {
        return Response.redirect(`${BASE_URL}/error?reason=expired_token`, 302);
      }

      await db.from("email_verifications").update({ used_at: new Date().toISOString() }).eq("id", record.id);

      await db.auth.admin.updateUserById(record.user_id, { email_confirm: true });

      return Response.redirect(`${BASE_URL}/success`, 302);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("verify-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
