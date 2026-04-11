import { supabase } from './supabase';

type EventType =
  | 'signup'
  | 'referral_used'
  | 'referral_link_shared'
  | 'contact_unlocked'
  | 'wallet_topup'
  | 'wallet_spent'
  | 'invite_sent'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'viral_popup_shown'
  | 'viral_popup_shared'
  | 'page_view';

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

export async function trackEvent(
  userId: string | null,
  eventType: EventType,
  eventData: Record<string, unknown> = {}
) {
  if (!userId) return;
  try {
    await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      session_id: getSessionId(),
    });
  } catch {
    // Silent fail for analytics
  }
}
