import { supabase } from './supabase';

const SIGNUP_BONUS = 3;

export async function grantSignupCredits(userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('signup_credits_granted')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.signup_credits_granted) return false;

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .maybeSingle();

  let walletId: string;
  let newBalance: number;

  if (!wallet) {
    const { data: created } = await supabase
      .from('wallets')
      .insert({ user_id: userId, balance: SIGNUP_BONUS, total_purchased: SIGNUP_BONUS })
      .select('id')
      .maybeSingle();
    if (!created) return false;
    walletId = created.id;
    newBalance = SIGNUP_BONUS;
  } else {
    walletId = wallet.id;
    newBalance = wallet.balance + SIGNUP_BONUS;
    await supabase.from('wallets').update({
      balance: newBalance,
      total_purchased: wallet.balance + SIGNUP_BONUS,
    }).eq('id', walletId);
  }

  await supabase.from('wallet_transactions').insert({
    wallet_id: walletId,
    user_id: userId,
    type: 'bonus',
    amount: SIGNUP_BONUS,
    balance_after: newBalance,
    description: 'Welcome bonus: 3 free contact unlocks',
    reference_type: 'signup_bonus',
    status: 'completed',
  });

  await supabase.from('profiles').update({
    wallet_balance: newBalance,
    signup_credits_granted: true,
  }).eq('id', userId);

  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Welcome to EquipLink!',
    message: `You received ${SIGNUP_BONUS} free credits to unlock contacts. Start browsing mechanics and suppliers now!`,
    type: 'success',
  });

  return true;
}
