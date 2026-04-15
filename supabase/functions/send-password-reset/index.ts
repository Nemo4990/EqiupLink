import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendKey = Deno.env.get("RESEND_API_KEY") || "";

interface PasswordResetRequest {
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email } = (await req.json()) as PasswordResetRequest;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendKey);

    const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(email);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ message: "If that email exists, a reset link will be sent" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) throw tokenError;

    const appUrl = Deno.env.get("SUPABASE_URL")?.split("/storage").join("") || "";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 40px 30px; }
      .content p { margin: 0 0 20px 0; font-size: 15px; color: #555; }
      .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
      .code { background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #374151; word-break: break-all; margin: 20px 0; }
      .footer { border-top: 1px solid #e5e7eb; padding: 20px 30px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
      .footer a { color: #667eea; text-decoration: none; }
      .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #92400e; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your account. If you didn't make this request, you can ignore this email.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <div class="code">${resetUrl}</div>
          <div class="warning">
            <strong>Note:</strong> This link will expire in 1 hour. If you need to reset your password again after it expires, please request a new reset link.
          </div>
          <p>If you have any questions or concerns, please contact our support team.</p>
          <p>Best regards,<br>The Equiplink Team</p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 10px 0;">© 2026 Equiplink. All rights reserved.</p>
          <p style="margin: 0;">This is an automated message, please do not reply directly to this email.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Reset Your Equiplink Password",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    return new Response(
      JSON.stringify({ message: "If that email exists, a reset link will be sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
