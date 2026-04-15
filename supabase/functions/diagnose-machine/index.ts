import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DiagnoseRequest {
  machineModel: string;
  faultCode?: string;
  symptoms: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return errorResponse("Server configuration error", 500);
    }

    if (!geminiKey) {
      console.error("Missing Gemini API key");
      return errorResponse("AI service not configured", 500);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    let user;
    try {
      const { data, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError) {
        console.error("Auth error:", authError.message);
      }
      if (!data?.user) {
        console.error("No user in auth response");
        return errorResponse("Unauthorized", 401);
      }
      user = data.user;
    } catch (e) {
      console.error("Auth exception:", e instanceof Error ? e.message : String(e));
      return errorResponse("Unauthorized", 401);
    }

    let body: DiagnoseRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      return errorResponse("Invalid JSON body", 400);
    }

    const { machineModel, faultCode, symptoms } = body;

    if (!machineModel || !symptoms || symptoms.trim().length < 10) {
      return errorResponse(
        "Machine model and symptoms (min 10 chars) are required",
        400
      );
    }

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return errorResponse("Error fetching user profile", 500);
    }

    const credits = Number(profileData?.credits ?? 0);

    if (credits <= 0) {
      return errorResponse("Insufficient credits", 403);
    }

    const systemPrompt = `You are a Caterpillar and Perkins Senior Field Service Engineer. Analyze the machine model, fault code, and symptoms. Provide: 1. Likely Cause, 2. Technical Troubleshooting Steps (referencing P1/P2/P3 pressures for transmissions if relevant), 3. Safety Precautions.`;

    const userMessage = `Machine: ${machineModel}${
      faultCode ? `\nFault Code: ${faultCode}` : ""
    }\n\nSymptoms/Problem: ${symptoms}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: userMessage }
          ],
          role: "user"
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", response.status, errorData);
      return errorResponse("AI service error", 500);
    }

    const aiData = await response.json();
    const aiResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      console.error("No response from AI model");
      return errorResponse("Failed to generate diagnosis", 500);
    }

    const { error: diagnosticError } = await supabaseClient
      .from("diagnostics_history")
      .insert({
        user_id: user.id,
        machine_model: machineModel,
        fault_code: faultCode || null,
        symptoms: symptoms,
        ai_response: aiResponse,
      });

    if (diagnosticError) {
      console.error("Diagnostic insert error:", diagnosticError);
      return errorResponse("Failed to save diagnostic", 500);
    }

    const { error: creditError } = await supabaseClient
      .from("profiles")
      .update({ credits: credits - 1 })
      .eq("id", user.id);

    if (creditError) {
      console.error("Credit deduction error:", creditError);
      return errorResponse("Failed to deduct credits", 500);
    }

    return successResponse({
      diagnosis: aiResponse,
      remainingCredits: credits - 1,
    });
  } catch (err) {
    console.error("diagnose-machine error:", err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error details:", errorMsg);
    return errorResponse(`Internal server error: ${errorMsg}`, 500);
  }
});
