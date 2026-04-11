import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface CreditRule {
  action_key: string;
  action_label: string;
  credits_cost: number;
  free_quota: number;
}

export async function getCreditRule(actionKey: string): Promise<CreditRule | null> {
  const { data } = await supabase
    .from('credit_rules')
    .select('action_key, action_label, credits_cost, free_quota')
    .eq('action_key', actionKey)
    .eq('is_active', true)
    .maybeSingle();
  return data as CreditRule | null;
}

export async function hasAccessGrant(
  userId: string,
  resourceId: string,
  resourceType: 'mechanic' | 'part' | 'rental' | 'job'
): Promise<boolean> {
  const { data } = await supabase
    .from('access_grants')
    .select('id')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .eq('resource_type', resourceType)
    .maybeSingle();
  return !!data;
}

export interface SpendCreditsResult {
  success: boolean;
  newBalance?: number;
  alreadyGranted?: boolean;
  insufficientBalance?: boolean;
}

export async function spendCredits(
  userId: string,
  actionKey: string,
  resourceId: string,
  resourceType: 'mechanic' | 'part' | 'rental' | 'job',
  description: string,
  promoEnabled = false
): Promise<SpendCreditsResult> {
  if (promoEnabled) return { success: true };

  const alreadyGranted = await hasAccessGrant(userId, resourceId, resourceType);
  if (alreadyGranted) return { success: true, alreadyGranted: true };

  const rule = await getCreditRule(actionKey);
  const cost = rule?.credits_cost ?? 1;

  const { data: walletData } = await supabase
    .from('wallets')
    .select('id, balance, total_spent')
    .eq('user_id', userId)
    .maybeSingle();

  if (!walletData) {
    toast.error('Wallet not found. Please try again.');
    return { success: false };
  }

  if (walletData.balance < cost) {
    return { success: false, insufficientBalance: true };
  }

  const newBalance = walletData.balance - cost;

  const { error: txError } = await supabase.from('wallet_transactions').insert({
    wallet_id: walletData.id,
    user_id: userId,
    type: 'deduction',
    amount: cost,
    balance_after: newBalance,
    description,
    reference_id: resourceId,
    reference_type: resourceType,
    status: 'completed',
  });

  if (txError) {
    toast.error('Transaction failed. Please try again.');
    return { success: false };
  }

  await supabase.from('wallets').update({
    balance: newBalance,
    total_spent: (walletData.total_spent ?? 0) + cost,
  }).eq('id', walletData.id);

  await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);

  const { error: grantError } = await supabase.from('access_grants').insert({
    user_id: userId,
    resource_id: resourceId,
    resource_type: resourceType,
    credits_spent: cost,
  });

  if (grantError) {
    console.error('access_grants insert failed (possible duplicate):', grantError);
  }

  return { success: true, newBalance };
}

export async function checkUserCanAct(
  userId: string,
  actionKey: string,
  countQuery: () => Promise<number>,
  promoEnabled = false
): Promise<{ canActFree: boolean; cost: number; balance: number }> {
  if (promoEnabled) return { canActFree: true, cost: 0, balance: 0 };

  const [rule, count, walletRes] = await Promise.all([
    getCreditRule(actionKey),
    countQuery(),
    supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle(),
  ]);

  const cost = rule?.credits_cost ?? 2;
  const freeQuota = rule?.free_quota ?? 0;
  const balance = walletRes.data?.balance ?? 0;
  const canActFree = count < freeQuota;

  return { canActFree, cost, balance };
}
