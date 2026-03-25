import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface Profile {
  id: string;
  name: string;
  role: string;
  updated_at: string;
}

interface BreakdownRequest {
  id: string;
  machine_type: string;
  machine_model: string;
  urgency: string;
  created_at: string;
}

interface MechanicStreak {
  mechanic_id: string;
  last_active_date: string | null;
  current_streak: number;
}

async function insertNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  relatedId: string | null = null
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    related_id: relatedId,
  });
}

async function sendMechanicEngagementNotifications() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Get all mechanics
  const { data: mechanics } = await supabase
    .from("profiles")
    .select("id, name, role, updated_at")
    .eq("role", "mechanic")
    .eq("is_suspended", false);

  if (!mechanics || mechanics.length === 0) return;

  // Get open breakdown requests count
  const { count: openJobCount } = await supabase
    .from("breakdown_requests")
    .select("id", { count: "exact" })
    .eq("status", "open");

  // Get newest open jobs (last 24h)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: newJobs } = await supabase
    .from("breakdown_requests")
    .select("id, machine_type, machine_model, urgency, created_at")
    .eq("status", "open")
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get all mechanic streaks
  const mechanicIds = mechanics.map((m: Profile) => m.id);
  const { data: streaks } = await supabase
    .from("mechanic_streaks")
    .select("mechanic_id, last_active_date, current_streak")
    .in("mechanic_id", mechanicIds);

  const streakMap: Record<string, MechanicStreak> = {};
  (streaks || []).forEach((s: MechanicStreak) => {
    streakMap[s.mechanic_id] = s;
  });

  const notifications: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    related_id: string | null;
  }> = [];

  for (const mechanic of mechanics as Profile[]) {
    const streak = streakMap[mechanic.id];
    const lastActive = streak?.last_active_date ? new Date(streak.last_active_date) : null;
    const daysSinceActive = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // New jobs available notification
    if (newJobs && newJobs.length > 0 && openJobCount && openJobCount > 0) {
      const job = (newJobs as BreakdownRequest[])[0];
      notifications.push({
        user_id: mechanic.id,
        title: `${openJobCount} Open Job${openJobCount > 1 ? "s" : ""} Available`,
        message: `New: ${job.machine_model} ${job.machine_type} breakdown — ${job.urgency} urgency. Be the first to take it!`,
        type: "job_request",
        is_read: false,
        related_id: job.id,
      });
    }

    // Streak about to break — not seen today
    if (streak && streak.current_streak >= 2 && daysSinceActive === 1) {
      notifications.push({
        user_id: mechanic.id,
        title: `Don't break your ${streak.current_streak}-day streak!`,
        message: `You've been active ${streak.current_streak} days in a row. Log in today to keep your streak alive and earn bonus points.`,
        type: "warning",
        is_read: false,
        related_id: null,
      });
    }

    // Re-engagement — gone for 3+ days
    if (daysSinceActive >= 3 && daysSinceActive < 7) {
      notifications.push({
        user_id: mechanic.id,
        title: `${openJobCount} jobs waiting — we miss you!`,
        message: `You've been away for ${daysSinceActive} days. There are ${openJobCount} open breakdowns right now. Check them out and earn!`,
        type: "info",
        is_read: false,
        related_id: null,
      });
    }

    // Long absence — 7+ days
    if (daysSinceActive >= 7) {
      notifications.push({
        user_id: mechanic.id,
        title: "It's been a while — jobs are waiting for you",
        message: `We haven't seen you in ${daysSinceActive} days. ${openJobCount} breakdown jobs are available. Log in now and restart your streak!`,
        type: "warning",
        is_read: false,
        related_id: null,
      });
    }

    // Streak milestone celebration
    if (streak && streak.last_active_date === todayStr) {
      const milestones = [3, 7, 14, 30, 60, 100];
      if (milestones.includes(streak.current_streak)) {
        notifications.push({
          user_id: mechanic.id,
          title: `${streak.current_streak}-Day Streak Milestone!`,
          message: `Incredible! You've logged in ${streak.current_streak} days in a row. You've earned a streak bonus. Keep it going!`,
          type: "success",
          is_read: false,
          related_id: null,
        });
      }
    }
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return { sent: notifications.length };
}

async function sendOwnerPartAlerts() {
  // Get owners who searched for a part category recently (via engagement_events)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: searchEvents } = await supabase
    .from("engagement_events")
    .select("user_id, meta, created_at")
    .eq("event_type", "part_search")
    .gte("created_at", threeDaysAgo);

  if (!searchEvents || searchEvents.length === 0) return { sent: 0 };

  const notifications: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    related_id: string | null;
  }> = [];

  const userSentMap: Record<string, boolean> = {};

  for (const event of searchEvents) {
    if (userSentMap[event.user_id]) continue;
    const category = event.meta?.category || "parts";

    // Check if new listings match their search category in last 48h
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("parts_listings")
      .select("id", { count: "exact" })
      .eq("category", category)
      .eq("is_active", true)
      .gte("created_at", twoDaysAgo);

    if (count && count > 0) {
      notifications.push({
        user_id: event.user_id,
        title: `${count} new ${category} part${count > 1 ? "s" : ""} just listed!`,
        message: `A part you searched for recently is now available. Check the marketplace before stock runs out.`,
        type: "info",
        is_read: false,
        related_id: null,
      });
      userSentMap[event.user_id] = true;
    }
  }

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return { sent: notifications.length };
}

async function sendSupplierLowStockAlerts() {
  const { data: suppliers } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "supplier")
    .eq("is_suspended", false);

  if (!suppliers || suppliers.length === 0) return { sent: 0 };

  const supplierIds = suppliers.map((s: { id: string }) => s.id);

  const { data: lowStockListings } = await supabase
    .from("parts_listings")
    .select("id, part_name, stock_quantity, supplier_id")
    .in("supplier_id", supplierIds)
    .eq("is_active", true)
    .lte("stock_quantity", 2)
    .gt("stock_quantity", 0);

  if (!lowStockListings || lowStockListings.length === 0) return { sent: 0 };

  const bySupplier: Record<string, typeof lowStockListings> = {};
  for (const listing of lowStockListings) {
    if (!bySupplier[listing.supplier_id]) bySupplier[listing.supplier_id] = [];
    bySupplier[listing.supplier_id].push(listing);
  }

  const notifications = Object.entries(bySupplier).map(([supplierId, listings]) => ({
    user_id: supplierId,
    title: `Low stock alert — ${listings.length} part${listings.length > 1 ? "s" : ""} running out`,
    message: `"${listings[0].part_name}"${listings.length > 1 ? ` and ${listings.length - 1} other${listings.length > 2 ? "s" : ""}` : ""} only ${listings[0].stock_quantity} left. Update your listings to avoid missing sales.`,
    type: "warning",
    is_read: false,
    related_id: null,
  }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }

  return { sent: notifications.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const target = body?.target || "all";

    const results: Record<string, unknown> = {};

    if (target === "all" || target === "mechanics") {
      results.mechanics = await sendMechanicEngagementNotifications();
    }

    if (target === "all" || target === "owners") {
      results.owners = await sendOwnerPartAlerts();
    }

    if (target === "all" || target === "suppliers") {
      results.suppliers = await sendSupplierLowStockAlerts();
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-engagement-notifications error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
