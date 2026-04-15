import { supabase } from './supabase';

interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: string;
  opacity: number;
  font_size: number;
  color: string;
}

export async function getWatermarkSettings(userId: string): Promise<WatermarkSettings | null> {
  try {
    const { data, error } = await supabase
      .from('watermark_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching watermark settings:', error);
    return null;
  }
}

export async function applyWatermarkToUrl(
  imageUrl: string,
  userId: string
): Promise<string> {
  try {
    const settings = await getWatermarkSettings(userId);

    if (!settings?.enabled) {
      return imageUrl;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/apply-watermark`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          imageUrl,
          userId,
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to apply watermark');
      return imageUrl;
    }

    const { url } = await response.json();
    return url || imageUrl;
  } catch (error) {
    console.error('Error applying watermark:', error);
    return imageUrl;
  }
}
