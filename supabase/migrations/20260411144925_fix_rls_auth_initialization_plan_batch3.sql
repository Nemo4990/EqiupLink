/*
  # Fix RLS Auth Initialization Plan (Batch 3)

  Replaces direct auth.uid() / auth.jwt() calls with (select auth.uid()) /
  (select auth.jwt()) in RLS policies to avoid per-row re-evaluation.

  Tables fixed:
  - device_tokens (5 policies)
  - mechanic_streaks (3 policies)
  - mechanic_rewards (3 policies)
  - mechanic_leaderboard_entries (2 policies)
  - engagement_events (2 policies)
  - analytics_events (2 policies)
  - breakdown_requests (1 policy)
  - email_verifications (3 policies)
  - referrals (4 policies)
  - part_views (2 policies)
  - part_inquiries (2 policies)
  - supplier_documents (5 policies)
  - platform_config (2 policies)
*/

-- ============================================================
-- device_tokens
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can update own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can view own device tokens" ON public.device_tokens;

CREATE POLICY "Admins can view all device tokens"
  ON public.device_tokens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own device tokens"
  ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own device tokens"
  ON public.device_tokens FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own device tokens"
  ON public.device_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- mechanic_streaks
-- ============================================================
DROP POLICY IF EXISTS "Mechanics can insert own streak" ON public.mechanic_streaks;
DROP POLICY IF EXISTS "Mechanics can update own streak" ON public.mechanic_streaks;
DROP POLICY IF EXISTS "Mechanics can view own streak" ON public.mechanic_streaks;

CREATE POLICY "Mechanics can insert own streak"
  ON public.mechanic_streaks FOR INSERT TO authenticated
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

CREATE POLICY "Mechanics can update own streak"
  ON public.mechanic_streaks FOR UPDATE TO authenticated
  USING (mechanic_id = (SELECT auth.uid()))
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

CREATE POLICY "Mechanics can view own streak"
  ON public.mechanic_streaks FOR SELECT TO authenticated
  USING (mechanic_id = (SELECT auth.uid()));

-- ============================================================
-- mechanic_rewards
-- ============================================================
DROP POLICY IF EXISTS "Mechanics can insert own rewards" ON public.mechanic_rewards;
DROP POLICY IF EXISTS "Mechanics can update own rewards" ON public.mechanic_rewards;
DROP POLICY IF EXISTS "Mechanics can view own rewards" ON public.mechanic_rewards;

CREATE POLICY "Mechanics can insert own rewards"
  ON public.mechanic_rewards FOR INSERT TO authenticated
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

CREATE POLICY "Mechanics can update own rewards"
  ON public.mechanic_rewards FOR UPDATE TO authenticated
  USING (mechanic_id = (SELECT auth.uid()))
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

CREATE POLICY "Mechanics can view own rewards"
  ON public.mechanic_rewards FOR SELECT TO authenticated
  USING (mechanic_id = (SELECT auth.uid()));

-- ============================================================
-- mechanic_leaderboard_entries
-- ============================================================
DROP POLICY IF EXISTS "Mechanics can insert own leaderboard entries" ON public.mechanic_leaderboard_entries;
DROP POLICY IF EXISTS "Mechanics can update own leaderboard entries" ON public.mechanic_leaderboard_entries;

CREATE POLICY "Mechanics can insert own leaderboard entries"
  ON public.mechanic_leaderboard_entries FOR INSERT TO authenticated
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

CREATE POLICY "Mechanics can update own leaderboard entries"
  ON public.mechanic_leaderboard_entries FOR UPDATE TO authenticated
  USING (mechanic_id = (SELECT auth.uid()))
  WITH CHECK (mechanic_id = (SELECT auth.uid()));

-- ============================================================
-- engagement_events
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own engagement events" ON public.engagement_events;
DROP POLICY IF EXISTS "Users can read own engagement events" ON public.engagement_events;

CREATE POLICY "Users can insert own engagement events"
  ON public.engagement_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read own engagement events"
  ON public.engagement_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- analytics_events
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can view own analytics events" ON public.analytics_events;

CREATE POLICY "Authenticated users can insert analytics events"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- breakdown_requests
-- ============================================================
DROP POLICY IF EXISTS "Users can view breakdown requests based on role" ON public.breakdown_requests;

CREATE POLICY "Users can view breakdown requests based on role"
  ON public.breakdown_requests FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR assigned_mechanic_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('mechanic', 'technician', 'admin')
    )
  );

-- ============================================================
-- email_verifications
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own email verifications" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can read own email verifications" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can update own email verifications" ON public.email_verifications;

CREATE POLICY "Users can insert own email verifications"
  ON public.email_verifications FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read own email verifications"
  ON public.email_verifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own email verifications"
  ON public.email_verifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- referrals
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals as referrer" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals as referred" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals as referrer" ON public.referrals;

CREATE POLICY "Authenticated users can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_id = (SELECT auth.uid()) OR referred_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own referrals as referrer"
  ON public.referrals FOR UPDATE TO authenticated
  USING (referrer_id = (SELECT auth.uid()))
  WITH CHECK (referrer_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own referrals as referred"
  ON public.referrals FOR SELECT TO authenticated
  USING (referred_id = (SELECT auth.uid()));

CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = (SELECT auth.uid()));

-- ============================================================
-- part_views
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert view events" ON public.part_views;
DROP POLICY IF EXISTS "Suppliers can view stats for own listings" ON public.part_views;

CREATE POLICY "Authenticated users can insert view events"
  ON public.part_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (SELECT auth.uid()));

CREATE POLICY "Suppliers can view stats for own listings"
  ON public.part_views FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_listings
      WHERE id = part_views.listing_id
      AND supplier_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- part_inquiries
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert inquiry events" ON public.part_inquiries;
DROP POLICY IF EXISTS "Suppliers can view inquiries for own listings" ON public.part_inquiries;

CREATE POLICY "Authenticated users can insert inquiry events"
  ON public.part_inquiries FOR INSERT TO authenticated
  WITH CHECK (buyer_id = (SELECT auth.uid()));

CREATE POLICY "Suppliers can view inquiries for own listings"
  ON public.part_inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parts_listings
      WHERE id = part_inquiries.listing_id
      AND supplier_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- supplier_documents
-- ============================================================
DROP POLICY IF EXISTS "Admins can update document status" ON public.supplier_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.supplier_documents;
DROP POLICY IF EXISTS "Suppliers can update own pending documents" ON public.supplier_documents;
DROP POLICY IF EXISTS "Suppliers can upload own documents" ON public.supplier_documents;
DROP POLICY IF EXISTS "Suppliers can view own documents" ON public.supplier_documents;

CREATE POLICY "Admins can update document status"
  ON public.supplier_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Admins can view all documents"
  ON public.supplier_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Suppliers can update own pending documents"
  ON public.supplier_documents FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Suppliers can upload own documents"
  ON public.supplier_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Suppliers can view own documents"
  ON public.supplier_documents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- platform_config
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert platform config" ON public.platform_config;
DROP POLICY IF EXISTS "Admins can update platform config" ON public.platform_config;

CREATE POLICY "Admins can insert platform config"
  ON public.platform_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Admins can update platform config"
  ON public.platform_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));
