import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const FROM_EMAIL = 'support@equiplink.org';
const FROM_NAME = 'EquipLink';

function reminderHtml(name: string, missingFields: string[]): string {
  const missingList = missingFields.length > 0
    ? `<ul style="margin:0 0 20px;padding-left:20px;color:#9ca3af;font-size:14px;line-height:1.8;">${missingFields.map(f => `<li>${f}</li>`).join('')}</ul>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete Your EquipLink Profile</title>
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
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;">Hi ${name}, your profile needs attention</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#9ca3af;line-height:1.6;">
                Your EquipLink account profile is incomplete. A complete profile helps you get the most out of the platform and builds trust with other users.
              </p>
              ${missingFields.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Missing Information</p>
                    ${missingList}
                  </td>
                </tr>
              </table>` : ''}
              <p style="margin:0 0 28px;font-size:14px;color:#9ca3af;line-height:1.6;">
                Please log in to your account and complete your profile to unlock full access to all features.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#facc15;border-radius:8px;padding:12px 28px;">
                    <a href="https://equiplink.org/profile" style="color:#111111;font-size:15px;font-weight:700;text-decoration:none;">Complete My Profile</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
                This reminder was sent by the EquipLink admin team. If you have any questions, contact us at <a href="mailto:${FROM_EMAIL}" style="color:#6b7280;text-decoration:none;">${FROM_EMAIL}</a>.
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, name, email, missingFields } = await req.json();

    if (!userId || !name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [{ email, name }],
        subject: 'Action Required: Complete Your EquipLink Profile',
        html: reminderHtml(name, missingFields ?? []),
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('Resend error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-profile-reminder error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
