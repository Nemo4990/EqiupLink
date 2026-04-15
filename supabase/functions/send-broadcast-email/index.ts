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

interface BroadcastRequest {
  broadcastId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { broadcastId } = (await req.json()) as BroadcastRequest;

    if (!broadcastId) {
      return new Response(JSON.stringify({ error: "broadcastId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendKey);

    const { data: broadcast, error: broadcastError } = await supabase
      .from("email_broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .maybeSingle();

    if (broadcastError || !broadcast) {
      return new Response(JSON.stringify({ error: "Broadcast not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: emailLogs, error: logsError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");

    if (logsError) throw logsError;

    let sentCount = 0;
    let failedCount = 0;

    for (const log of emailLogs) {
      try {
        await resend.emails.send({
          from: "noreply@equiplink.com",
          to: log.email,
          subject: broadcast.subject,
          html: broadcast.html_content,
        });

        await supabase
          .from("email_logs")
          .update({ status: "sent" })
          .eq("id", log.id);

        sentCount++;
      } catch (error) {
        failedCount++;
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", log.id);
      }
    }

    const { error: updateError } = await supabase
      .from("email_broadcasts")
      .update({
        status: "completed",
        sent_count: broadcast.sent_count + sentCount,
        failed_count: broadcast.failed_count + failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", broadcastId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        failedCount,
        message: `Email broadcast completed. Sent: ${sentCount}, Failed: ${failedCount}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send broadcast emails",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
