import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface WatermarkRequest {
  imageUrl: string;
  userId: string;
}

interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: string;
  opacity: number;
  font_size: number;
  color: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageUrl, userId } = (await req.json()) as WatermarkRequest;

    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl or userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("watermark_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ url: imageUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(imageUrl);
    const blob = await response.arrayBuffer();

    const positionMap: Record<string, [number, number]> = {
      "top-left": [20, 20],
      "top-right": [-20, 20],
      "bottom-left": [20, -20],
      "bottom-right": [-20, -20],
      center: [0, 0],
    };

    const [x, y] = positionMap[settings.position] || [20, -20];

    const watermarkedImageUrl = await addWatermarkToImage(
      blob,
      settings.text,
      settings.font_size,
      settings.color,
      settings.opacity,
      [x, y]
    );

    return new Response(JSON.stringify({ url: watermarkedImageUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Watermark error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to apply watermark" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function addWatermarkToImage(
  imageData: ArrayBuffer,
  text: string,
  fontSize: number,
  color: string,
  opacity: number,
  position: [number, number]
): Promise<string> {
  const canvas = new OffscreenCanvas(1200, 800);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const blob = new Blob([imageData]);
  const bitmap = await createImageBitmap(blob);

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  ctx.drawImage(bitmap, 0, 0);

  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  const [xOffset, yOffset] = position;
  const x =
    xOffset < 0 ? canvas.width + xOffset : xOffset > 0 ? xOffset : canvas.width / 2;
  const y =
    yOffset < 0
      ? canvas.height + yOffset
      : yOffset > 0
        ? yOffset
        : canvas.height / 2;

  ctx.fillText(text, x, y);

  const watermarkedBlob = await canvas.convertToBlob({ type: "image/jpeg" });
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(watermarkedBlob);
  });
}
