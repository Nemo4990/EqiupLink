import { supabase } from './supabase';

const REFERRER_REWARD = 5;
const REFERRED_REWARD = 3;

export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  if (!code || code.length < 4) return { valid: false };

  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('referral_code', code.toUpperCase().trim())
    .maybeSingle();

  if (!data) return { valid: false };
  return { valid: true, referrerId: data.id, referrerName: data.name };
}

export async function processReferral(referrerId: string, referredId: string): Promise<boolean> {
  if (referrerId === referredId) return false;

  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrerId)
    .eq('referred_id', referredId)
    .maybeSingle();

  if (existing) return false;

  await supabase.from('profiles').update({ referred_by: referrerId }).eq('id', referredId);

  await supabase.from('referrals').insert({
    referrer_id: referrerId,
    referred_id: referredId,
    referrer_reward: REFERRER_REWARD,
    referred_reward: REFERRED_REWARD,
    status: 'pending',
  });

  return true;
}

export async function completeReferralRewards(referredId: string): Promise<void> {
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', referredId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!referral) return;

  await grantReferralCredits(referral.referred_id, referral.referred_reward, 'Welcome bonus from referral');
  await grantReferralCredits(referral.referrer_id, referral.referrer_reward, 'Referral reward: new user joined');

  await supabase.from('referrals').update({
    status: 'completed',
    referrer_rewarded: true,
    referred_rewarded: true,
    completed_at: new Date().toISOString(),
  }).eq('id', referral.id);

  await supabase.from('notifications').insert({
    user_id: referral.referrer_id,
    title: 'Referral Reward Earned!',
    message: `Someone joined using your referral code! You earned ${referral.referrer_reward} ETB credits.`,
    type: 'success',
  });
}

async function grantReferralCredits(userId: string, amount: number, description: string) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet } = await supabase
      .from('wallets')
      .insert({ user_id: userId, balance: amount, total_purchased: amount })
      .select('id, balance')
      .maybeSingle();

    if (newWallet) {
      await supabase.from('wallet_transactions').insert({
        wallet_id: newWallet.id,
        user_id: userId,
        type: 'bonus',
        amount,
        balance_after: amount,
        description,
        reference_type: 'referral',
        status: 'completed',
      });
      await supabase.from('profiles').update({ wallet_balance: amount }).eq('id', userId);
    }
    return;
  }

  const newBalance = wallet.balance + amount;
  await supabase.from('wallets').update({
    balance: newBalance,
    total_purchased: wallet.balance + amount,
  }).eq('id', wallet.id);

  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    user_id: userId,
    type: 'bonus',
    amount,
    balance_after: newBalance,
    description,
    reference_type: 'referral',
    status: 'completed',
  });

  await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
}

export async function getReferralStats(userId: string) {
  const [profileRes, referralsRes, totalEarnedRes] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', userId).maybeSingle(),
    supabase.from('referrals').select('id, status, referred_id, referrer_reward, created_at, completed_at').eq('referrer_id', userId).order('created_at', { ascending: false }),
    supabase.from('referrals').select('referrer_reward').eq('referrer_id', userId).eq('status', 'completed'),
  ]);

  const referralCode = profileRes.data?.referral_code || '';
  const referrals = referralsRes.data || [];
  const totalEarned = (totalEarnedRes.data || []).reduce((sum, r) => sum + (r.referrer_reward || 0), 0);

  return {
    referralCode,
    totalInvites: referrals.length,
    completedInvites: referrals.filter(r => r.status === 'completed').length,
    pendingInvites: referrals.filter(r => r.status === 'pending').length,
    totalEarned,
    referrals,
  };
}

export function getReferralLink(code: string): string {
  const base = window.location.origin;
  return `${base}/register?ref=${code}`;
}

export function getShareText(code: string): string {
  return `Join EquipLink - Ethiopia's marketplace for heavy equipment services! Use my referral code ${code} and get free credits. ${getReferralLink(code)}`;
}
