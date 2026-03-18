import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { machineType, brand, problem } = await req.json();

    if (!machineType || !problem) {
      return errorResponse("machineType and problem are required", 400);
    }

    const sanitize = (s: string) =>
      s.replace(/[<>]/g, "").trim().substring(0, 2000);
    const cleanType = sanitize(machineType);
    const cleanBrand = sanitize(brand || "");
    const cleanProblem = sanitize(problem);

    if (cleanProblem.length < 10) {
      return errorResponse(
        "Problem description must be at least 10 characters",
        400
      );
    }

    const { count: sessionCount } = await supabaseClient
      .from("ai_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: rule } = await supabaseClient
      .from("credit_rules")
      .select("credits_cost, free_quota")
      .eq("action_key", "ai_diagnose")
      .eq("is_active", true)
      .maybeSingle();

    const freeQuota = rule?.free_quota ?? 3;
    const cost = rule?.credits_cost ?? 1;
    const usedCount = sessionCount ?? 0;

    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const isPro = profileData?.subscription_tier === "pro";

    if (!isPro && usedCount >= freeQuota) {
      const { data: wallet } = await supabaseClient
        .from("wallets")
        .select("id, balance, total_spent")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet || wallet.balance < cost) {
        return errorResponse("insufficient_balance", 402);
      }

      const newBalance = wallet.balance - cost;

      await supabaseClient.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: user.id,
        type: "deduction",
        amount: cost,
        balance_after: newBalance,
        description: `AI diagnosis: ${cleanType} - ${cleanBrand}`,
        reference_type: "ai_diagnose",
        status: "completed",
      });

      await supabaseClient
        .from("wallets")
        .update({
          balance: newBalance,
          total_spent: (wallet.total_spent ?? 0) + cost,
        })
        .eq("id", wallet.id);

      await supabaseClient
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", user.id);
    }

    let aiResponse;

    if (!openaiKey) {
      aiResponse = generateFallbackResponse(cleanType, cleanBrand, cleanProblem);
    } else {
      const prompt = `You are a professional heavy equipment mechanic.

Analyze the machine issue and provide:
1. Likely causes
2. Step-by-step troubleshooting checks
3. Severity level (Low, Medium, Critical)
4. Recommendation to call a technician if needed

Machine Type: ${cleanType}
Brand: ${cleanBrand}
Problem: ${cleanProblem}

Provide clear, practical, field-ready advice.

IMPORTANT: You MUST respond in valid JSON with this exact structure:
{
  "causes": ["cause 1", "cause 2"],
  "steps": ["step 1", "step 2"],
  "severity": "Low|Medium|Critical",
  "recommendation": "your recommendation text"
}

Respond ONLY with the JSON object, nothing else.`;

      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 1000,
          }),
        }
      );

      if (!openaiRes.ok) {
        aiResponse = generateFallbackResponse(
          cleanType,
          cleanBrand,
          cleanProblem
        );
      } else {
        const openaiData = await openaiRes.json();
        const content = openaiData.choices?.[0]?.message?.content ?? "";
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackResponse(cleanType, cleanBrand, cleanProblem);
        } catch {
          aiResponse = generateFallbackResponse(
            cleanType,
            cleanBrand,
            cleanProblem
          );
        }
      }
    }

    if (
      !aiResponse.causes ||
      !aiResponse.steps ||
      !aiResponse.severity ||
      !aiResponse.recommendation
    ) {
      aiResponse = generateFallbackResponse(cleanType, cleanBrand, cleanProblem);
    }

    await supabaseClient.from("ai_sessions").insert({
      user_id: user.id,
      machine_type: cleanType,
      brand: cleanBrand,
      problem: cleanProblem,
      ai_response: aiResponse,
    });

    return new Response(JSON.stringify(aiResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-diagnose error:", err);
    return errorResponse("Internal server error", 500);
  }
});

function generateFallbackResponse(
  machineType: string,
  brand: string,
  problem: string
) {
  const problemLower = problem.toLowerCase();

  let severity = "Medium";
  if (
    problemLower.includes("smoke") ||
    problemLower.includes("fire") ||
    problemLower.includes("leak") ||
    problemLower.includes("crack") ||
    problemLower.includes("break") ||
    problemLower.includes("fail")
  ) {
    severity = "Critical";
  } else if (
    problemLower.includes("noise") ||
    problemLower.includes("vibrat") ||
    problemLower.includes("slow")
  ) {
    severity = "Medium";
  } else if (
    problemLower.includes("minor") ||
    problemLower.includes("small") ||
    problemLower.includes("light")
  ) {
    severity = "Low";
  }

  const causes = [
    `Wear and tear on ${machineType} components commonly associated with this type of issue`,
    `Possible fluid level or quality degradation in the ${brand || machineType} system`,
    "Environmental factors such as dust, moisture, or temperature extremes",
    "Potential misalignment or loose connections in mechanical assemblies",
  ];

  const steps = [
    `Perform a thorough visual inspection of the ${machineType} exterior and accessible components`,
    "Check all fluid levels including hydraulic oil, engine oil, coolant, and fuel",
    "Inspect electrical connections, fuses, and wiring harnesses for damage or corrosion",
    "Test the machine under controlled conditions and note when the problem occurs",
    "Check for any error codes on the machine's diagnostic display if available",
    "Document all findings with photos before attempting any repairs",
  ];

  const recommendation =
    severity === "Critical"
      ? `This appears to be a critical issue with your ${brand || ""} ${machineType}. Stop operating the machine immediately and contact a certified technician. Continued use may cause further damage or safety hazards.`
      : severity === "Medium"
        ? `This issue on your ${brand || ""} ${machineType} should be addressed soon to prevent escalation. If the troubleshooting steps above do not resolve it, we recommend hiring a professional mechanic through EquipLink.`
        : `This seems to be a minor issue with your ${brand || ""} ${machineType}. You may be able to resolve it with the steps above. If the problem persists, consider consulting a technician.`;

  return { causes, steps, severity, recommendation };
}
