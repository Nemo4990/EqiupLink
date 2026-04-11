import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface PromoConfig {
  monetizationMode: 'promo' | 'paid';
  promoEnabled: boolean;
  promoStartDate: string;
  promoEndDate: string;
  promoMessage: string;
  loading: boolean;
}

let cachedConfig: PromoConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function fetchPromoConfig(): Promise<PromoConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) return cachedConfig;

  const { data } = await supabase
    .from('platform_config')
    .select('config_key, config_value')
    .in('config_key', [
      'monetization_mode',
      'promo_mode_enabled',
      'promo_start_date',
      'promo_end_date',
      'promo_message',
    ]);

  const map: Record<string, string> = {};
  (data || []).forEach((row: { config_key: string; config_value: string }) => {
    map[row.config_key] = row.config_value;
  });

  const mode = (map['monetization_mode'] || 'promo') as 'promo' | 'paid';
  cachedConfig = {
    monetizationMode: mode,
    promoEnabled: mode === 'promo' && map['promo_mode_enabled'] === 'true',
    promoStartDate: map['promo_start_date'] || '',
    promoEndDate: map['promo_end_date'] || '',
    promoMessage: map['promo_message'] || '',
    loading: false,
  };
  cacheTime = Date.now();
  return cachedConfig;
}

export function invalidatePromoCache() {
  cachedConfig = null;
  cacheTime = 0;
}

export function usePromoMode(): PromoConfig {
  const [config, setConfig] = useState<PromoConfig>({
    monetizationMode: 'promo',
    promoEnabled: true,
    promoStartDate: '',
    promoEndDate: '',
    promoMessage: '',
    loading: true,
  });

  useEffect(() => {
    fetchPromoConfig().then(setConfig);
  }, []);

  return config;
}
