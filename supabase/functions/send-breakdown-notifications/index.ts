import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BreakdownRequest {
  id: string;
  owner_id: string;
  machine_type: string;
  machine_model: string;
  location: string;
  urgency: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { breakdownId } = await req.json();

    if (!breakdownId) {
      return new Response(
        JSON.stringify({ error: 'breakdownId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: breakdown, error: breakdownError } = await supabase
      .from('breakdown_requests')
      .select('id, owner_id, machine_type, machine_model, location, urgency')
      .eq('id', breakdownId)
      .single();

    if (breakdownError || !breakdown) {
      return new Response(
        JSON.stringify({ error: 'Breakdown request not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: mechanics, error: mechanicsError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'mechanic')
      .eq('is_approved', true)
      .eq('is_suspended', false);

    if (mechanicsError || !mechanics) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch mechanics' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const notifications = mechanics.map((mechanic) => ({
      user_id: mechanic.id,
      title: 'New Breakdown Request',
      message: `${breakdown.machine_type} (${breakdown.machine_model}) needs repair at ${breakdown.location}. Urgency: ${breakdown.urgency}`,
      type: 'breakdown',
      link: `/breakdown/${breakdown.id}`,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to send notifications' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
