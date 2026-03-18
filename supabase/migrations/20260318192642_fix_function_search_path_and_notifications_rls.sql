/*
  # Fix Function Search Path and Notifications RLS

  ## Summary

  1. Fixes `expire_pro_subscriptions` function by adding `SET search_path = ''`
     and fully qualifying all table references. This prevents search_path
     injection attacks on SECURITY DEFINER functions.

  2. Fixes the `notifications` INSERT policy which had `WITH CHECK (true)`,
     effectively bypassing RLS for authenticated users. Replaced with a policy
     that only allows users to insert notifications for themselves.
*/

-- Fix function search path
CREATE OR REPLACE FUNCTION public.expire_pro_subscriptions()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  UPDATE public.profiles
  SET subscription_tier = 'free', pro_badge = false, pro_expires_at = NULL
  WHERE id IN (
    SELECT DISTINCT user_id FROM public.subscriptions WHERE status = 'expired'
  )
  AND subscription_tier = 'pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s2
    WHERE s2.user_id = public.profiles.id AND s2.status = 'active'
  );
END;
$$;

-- Fix notifications INSERT policy (was always true)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert notifications for themselves"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
