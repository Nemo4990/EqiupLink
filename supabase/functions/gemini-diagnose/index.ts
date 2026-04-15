import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiagnoseRequest {
  machineModel: string;
  faultCode?: string;
  symptoms: string;
}

interface DiagnoseResponse {
  diagnosis: string;
  remainingCredits: number;
}

function errorResponse(message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return errorResponse("Server configuration error", 500);
    }

    if (!geminiApiKey) {
      console.error("Missing Gemini API key");
      return errorResponse("AI service not configured", 500);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth failed:", authError?.message || "No user");
      return errorResponse("Unauthorized", 401);
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("credit_balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError.message);
      return errorResponse("Failed to fetch user profile", 500);
    }

    if (!profile || profile.credit_balance <= 0) {
      return errorResponse("Insufficient credits", 403);
    }

    const body: DiagnoseRequest = await req.json();
    const { machineModel, faultCode, symptoms } = body;

    if (!machineModel || !symptoms) {
      return errorResponse("Missing required fields: machineModel, symptoms", 400);
    }

    const systemPrompt = `You are a Caterpillar and Perkins Senior Field Service Engineer with expertise in heavy equipment diagnostics and repair. Your role is to provide professional, safety-conscious technical guidance for equipment operators and technicians.

When analyzing machine issues, provide structured technical guidance covering:
1. **Likely Cause** - Technical analysis of the root cause
2. **Troubleshooting Steps** - Detailed diagnostic procedures (reference P1/P2/P3 pressures for transmissions if relevant)
3. **Safety Precautions** - Critical safety warnings and operational guidelines

Format your response in clear, professional markdown with proper headings and bullet points for easy reading.`;

    const userPrompt = `Machine Model: ${machineModel}
${faultCode ? `Fault Code: ${faultCode}` : ""}
Symptoms: ${symptoms}

Please analyze this equipment issue and provide diagnostic guidance.`;

    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ],
          role: "user"
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("Gemini API error:", error);
      return errorResponse("AI service error", 500);
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error("No response from Gemini");
      return errorResponse("AI service error", 500);
    }

    const { error: insertError } = await supabaseClient
      .from("diagnostics_history")
      .insert({
        user_id: user.id,
        machine_model: machineModel,
        fault_code: faultCode || null,
        symptoms,
        ai_response: aiResponse,
      });

    if (insertError) {
      console.error("Insert error:", insertError.message);
      return errorResponse("Failed to save diagnosis", 500);
    }

    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ credit_balance: profile.credit_balance - 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("Credit update error:", updateError.message);
      return errorResponse("Failed to update credits", 500);
    }

    const response: DiagnoseResponse = {
      diagnosis: aiResponse,
      remainingCredits: profile.credit_balance - 1,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Function error:", message);
    return errorResponse("Internal server error", 500);
  }
});
