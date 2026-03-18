/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces bare `auth.uid()` calls in RLS policies with `(select auth.uid())`
  so Postgres evaluates them once per query instead of once per row.

  ## Tables fixed
  - legal_settings
  - breakdown_requests
  - parts_listings
  - equipment_rentals
  - user_payments
  - service_history
  - commission_fees
  - access_grants
  - contact_credits
  - credit_rules
  - pro_plan_features
  - ai_sessions
*/

-- legal_settings
DROP POLICY IF EXISTS "Admins can update legal settings" ON public.legal_settings;
DROP POLICY IF EXISTS "Admins can insert legal settings" ON public.legal_settings;

CREATE POLICY "Admins can update legal settings"
  ON public.legal_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert legal settings"
  ON public.legal_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- breakdown_requests
DROP POLICY IF EXISTS "Users can view relevant breakdown requests" ON public.breakdown_requests;

CREATE POLICY "Users can view relevant breakdown requests"
  ON public.breakdown_requests FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (
      SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())
    ) = 'mechanic'
  );

-- parts_listings (column is is_active)
DROP POLICY IF EXISTS "Authenticated users can view parts listings" ON public.parts_listings;

CREATE POLICY "Authenticated users can view parts listings"
  ON public.parts_listings FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR supplier_id = (SELECT auth.uid())
  );

-- equipment_rentals (column is is_available)
DROP POLICY IF EXISTS "Authenticated users can view equipment rentals" ON public.equipment_rentals;

CREATE POLICY "Authenticated users can view equipment rentals"
  ON public.equipment_rentals FOR SELECT
  TO authenticated
  USING (
    is_available = true
    OR provider_id = (SELECT auth.uid())
  );

-- user_payments
DROP POLICY IF EXISTS "Users can view own or all payments" ON public.user_payments;

CREATE POLICY "Users can view own or all payments"
  ON public.user_payments FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())
    ) = 'admin'
  );

-- service_history
DROP POLICY IF EXISTS "Users can view relevant service history" ON public.service_history;

CREATE POLICY "Users can view relevant service history"
  ON public.service_history FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR mechanic_id = (SELECT auth.uid())
  );

-- commission_fees
DROP POLICY IF EXISTS "Admins can delete commission fees" ON public.commission_fees;
DROP POLICY IF EXISTS "Admins can insert commission fees" ON public.commission_fees;
DROP POLICY IF EXISTS "Admins can manage commission fees" ON public.commission_fees;

CREATE POLICY "Admins can insert commission fees"
  ON public.commission_fees FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can manage commission fees"
  ON public.commission_fees FOR UPDATE
  TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can delete commission fees"
  ON public.commission_fees FOR DELETE
  TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

-- access_grants
DROP POLICY IF EXISTS "Users can insert own access grants" ON public.access_grants;
DROP POLICY IF EXISTS "Users can view own access grants" ON public.access_grants;

CREATE POLICY "Users can view own access grants"
  ON public.access_grants FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own access grants"
  ON public.access_grants FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- contact_credits
DROP POLICY IF EXISTS "Admins can delete contact credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Admins can insert contact credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Users can update own contact credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Users can view own contact credits" ON public.contact_credits;

CREATE POLICY "Users can view own contact credits"
  ON public.contact_credits FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Users can update own contact credits"
  ON public.contact_credits FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can insert contact credits"
  ON public.contact_credits FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Admins can delete contact credits"
  ON public.contact_credits FOR DELETE
  TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

-- credit_rules
DROP POLICY IF EXISTS "Only admins can insert credit rules" ON public.credit_rules;
DROP POLICY IF EXISTS "Only admins can modify credit rules" ON public.credit_rules;

CREATE POLICY "Only admins can insert credit rules"
  ON public.credit_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify credit rules"
  ON public.credit_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- pro_plan_features
DROP POLICY IF EXISTS "Admins can insert pro features" ON public.pro_plan_features;
DROP POLICY IF EXISTS "Admins can update pro features" ON public.pro_plan_features;

CREATE POLICY "Admins can insert pro features"
  ON public.pro_plan_features FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update pro features"
  ON public.pro_plan_features FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- ai_sessions
DROP POLICY IF EXISTS "Users can insert own AI sessions" ON public.ai_sessions;
DROP POLICY IF EXISTS "Users can read own AI sessions" ON public.ai_sessions;

CREATE POLICY "Users can read own AI sessions"
  ON public.ai_sessions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own AI sessions"
  ON public.ai_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
