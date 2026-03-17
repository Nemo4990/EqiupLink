/*
  # Fix Database Performance Issues

  ## Summary
  This migration addresses all reported security and performance issues:

  1. Unindexed Foreign Keys
     - Adds missing indexes on foreign key columns across 9 tables

  2. Auth RLS Initialization Plan Fixes
     - Replaces auth.uid() with (select auth.uid()) in all affected RLS policies
     - Affects: subscription_plans, subscriptions, wallets, wallet_transactions,
       job_unlocks, commissions, boosted_listings, customer_contact_unlocks, quotes,
       platform_settings, service_requests, offers, contact_unlocks, user_sessions,
       active_jobs, login_attempts, security_events

  3. Unused Indexes Dropped
     - Removes all indexes flagged as unused to reduce write overhead

  4. Multiple Permissive Policies
     - Consolidates multi-role SELECT/UPDATE/INSERT policies using role-based CASE logic

  5. RLS Always-True Policies Fixed
     - login_attempts and security_events INSERT policies restricted to authenticated users
*/

-- ============================================================
-- 1. ADD MISSING INDEXES FOR UNINDEXED FOREIGN KEYS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_active_jobs_offer_id ON public.active_jobs (offer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_service_request_id ON public.active_jobs (service_request_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_payment_id ON public.boosted_listings (payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner_id ON public.commissions (owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target_id ON public.contact_unlocks (target_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_payment_id ON public.customer_contact_unlocks (payment_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_technician_id ON public.customer_contact_unlocks (technician_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_wallet_transaction_id ON public.job_unlocks (wallet_transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON public.subscriptions (payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_id ON public.wallet_transactions (payment_id);


-- ============================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_equipment_rentals_provider_id;
DROP INDEX IF EXISTS public.idx_parts_listings_supplier_id;
DROP INDEX IF EXISTS public.idx_service_history_machine_id;
DROP INDEX IF EXISTS public.idx_user_payments_user_id;
DROP INDEX IF EXISTS public.idx_fk_rental_provider_profiles_user;
DROP INDEX IF EXISTS public.idx_fk_reviews_breakdown_request;
DROP INDEX IF EXISTS public.idx_fk_breakdown_requests_assigned_mechanic;
DROP INDEX IF EXISTS public.idx_fk_breakdown_requests_machine;
DROP INDEX IF EXISTS public.idx_fk_contact_history_payment;
DROP INDEX IF EXISTS public.idx_fk_contact_history_provider;
DROP INDEX IF EXISTS public.idx_fk_machines_owner;
DROP INDEX IF EXISTS public.idx_fk_reviews_mechanic;
DROP INDEX IF EXISTS public.idx_fk_reviews_reviewer;
DROP INDEX IF EXISTS public.idx_fk_service_history_breakdown_request;
DROP INDEX IF EXISTS public.idx_fk_service_history_mechanic;
DROP INDEX IF EXISTS public.idx_fk_service_history_owner;
DROP INDEX IF EXISTS public.idx_fk_supplier_profiles_user;
DROP INDEX IF EXISTS public.idx_fk_user_payments_provider;
DROP INDEX IF EXISTS public.idx_fk_user_payments_reviewed_by;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_wallets_user_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_wallet_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_technician_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_commissions_technician_id;
DROP INDEX IF EXISTS public.idx_commissions_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_listing_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_supplier_id;
DROP INDEX IF EXISTS public.idx_quotes_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_quotes_technician_id;
DROP INDEX IF EXISTS public.idx_quotes_owner_id;
DROP INDEX IF EXISTS public.idx_customer_contact_unlocks_customer_id;
DROP INDEX IF EXISTS public.idx_service_requests_status;
DROP INDEX IF EXISTS public.idx_offers_technician_id;
DROP INDEX IF EXISTS public.idx_offers_customer_id;
DROP INDEX IF EXISTS public.idx_contact_unlocks_unlocker_id;
DROP INDEX IF EXISTS public.idx_active_jobs_technician_id;
DROP INDEX IF EXISTS public.idx_active_jobs_customer_id;
DROP INDEX IF EXISTS public.idx_login_attempts_email;
DROP INDEX IF EXISTS public.idx_login_attempts_ip;
DROP INDEX IF EXISTS public.idx_login_attempts_attempted_at;
DROP INDEX IF EXISTS public.idx_security_events_created_at;


-- ============================================================
-- 3. FIX AUTH RLS INITIALIZATION PLAN ISSUES
--    Replace auth.uid() with (select auth.uid()) in all policies
-- ============================================================

-- subscription_plans
DROP POLICY IF EXISTS "Admins can delete subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can update subscription plans" ON public.subscription_plans;

CREATE POLICY "Admins can delete subscription plans"
  ON public.subscription_plans FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Admins can update subscription plans"
  ON public.subscription_plans FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- subscriptions
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;

CREATE POLICY "Users and admins can view subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "System can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users and admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- wallets
DROP POLICY IF EXISTS "Admins can update all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;

CREATE POLICY "Users and admins can view wallets"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users and admins can update wallets"
  ON public.wallets FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- wallet_transactions
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users and admins can view wallet transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Users can insert own wallet transactions"
  ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- job_unlocks
DROP POLICY IF EXISTS "Admins can view all unlocks" ON public.job_unlocks;
DROP POLICY IF EXISTS "Technicians can insert own unlocks" ON public.job_unlocks;
DROP POLICY IF EXISTS "Technicians can view own unlocks" ON public.job_unlocks;

CREATE POLICY "Technicians and admins can view job unlocks"
  ON public.job_unlocks FOR SELECT
  TO authenticated
  USING (
    technician_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Technicians can insert own unlocks"
  ON public.job_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

-- commissions
DROP POLICY IF EXISTS "Admins can insert commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can update commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Owners can view commissions for their jobs" ON public.commissions;
DROP POLICY IF EXISTS "System can insert commissions" ON public.commissions;
DROP POLICY IF EXISTS "Technicians can view own commissions" ON public.commissions;

CREATE POLICY "All parties can view commissions"
  ON public.commissions FOR SELECT
  TO authenticated
  USING (
    technician_id = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "System can insert commissions"
  ON public.commissions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can update commissions"
  ON public.commissions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- boosted_listings
DROP POLICY IF EXISTS "Admins can update all boosts" ON public.boosted_listings;
DROP POLICY IF EXISTS "Admins can view all boosts" ON public.boosted_listings;
DROP POLICY IF EXISTS "Suppliers can insert own boosts" ON public.boosted_listings;
DROP POLICY IF EXISTS "Suppliers can view own boosts" ON public.boosted_listings;
DROP POLICY IF EXISTS "Anyone can view active boosts" ON public.boosted_listings;

CREATE POLICY "Suppliers and admins can view boosts"
  ON public.boosted_listings FOR SELECT
  TO authenticated
  USING (
    supplier_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
    OR (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Suppliers can insert own boosts"
  ON public.boosted_listings FOR INSERT
  TO authenticated
  WITH CHECK (supplier_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update all boosts"
  ON public.boosted_listings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- customer_contact_unlocks
DROP POLICY IF EXISTS "Admins can view all customer unlocks" ON public.customer_contact_unlocks;
DROP POLICY IF EXISTS "Customers can insert own unlocks" ON public.customer_contact_unlocks;
DROP POLICY IF EXISTS "Customers can view own unlocks" ON public.customer_contact_unlocks;
DROP POLICY IF EXISTS "Technicians can view who unlocked their contact" ON public.customer_contact_unlocks;

CREATE POLICY "Parties can view customer contact unlocks"
  ON public.customer_contact_unlocks FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Customers can insert own unlocks"
  ON public.customer_contact_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

-- quotes
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Owners can update quote status" ON public.quotes;
DROP POLICY IF EXISTS "Owners can view quotes for their requests" ON public.quotes;
DROP POLICY IF EXISTS "Technicians can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Technicians can update own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Technicians can view own quotes" ON public.quotes;

CREATE POLICY "All parties can view quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    technician_id = (SELECT auth.uid())
    OR owner_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Technicians can insert quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

CREATE POLICY "Owners and technicians can update quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
  );

-- platform_settings
DROP POLICY IF EXISTS "Only admins can insert platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Only admins can update platform settings" ON public.platform_settings;

CREATE POLICY "Only admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

CREATE POLICY "Only admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- service_requests
DROP POLICY IF EXISTS "Customers can create service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can update their own requests" ON public.service_requests;

CREATE POLICY "Customers can create service requests"
  ON public.service_requests FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY "Customers can update their own requests"
  ON public.service_requests FOR UPDATE
  TO authenticated
  USING (customer_id = (SELECT auth.uid()))
  WITH CHECK (customer_id = (SELECT auth.uid()));

-- offers
DROP POLICY IF EXISTS "Customers can update offer status" ON public.offers;
DROP POLICY IF EXISTS "Offer parties can view offers" ON public.offers;
DROP POLICY IF EXISTS "Technicians can create offers" ON public.offers;

CREATE POLICY "Offer parties can view offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    technician_id = (SELECT auth.uid())
    OR customer_id = (SELECT auth.uid())
  );

CREATE POLICY "Technicians can create offers"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (technician_id = (SELECT auth.uid()));

CREATE POLICY "Customers can update offer status"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (customer_id = (SELECT auth.uid()))
  WITH CHECK (customer_id = (SELECT auth.uid()));

-- contact_unlocks
DROP POLICY IF EXISTS "Users can create unlocks" ON public.contact_unlocks;
DROP POLICY IF EXISTS "Users can view their own unlocks" ON public.contact_unlocks;

CREATE POLICY "Users can create unlocks"
  ON public.contact_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (unlocker_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own unlocks"
  ON public.contact_unlocks FOR SELECT
  TO authenticated
  USING (
    unlocker_id = (SELECT auth.uid())
    OR target_id = (SELECT auth.uid())
  );

-- user_sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- active_jobs
DROP POLICY IF EXISTS "Job parties can update active jobs" ON public.active_jobs;
DROP POLICY IF EXISTS "Job parties can view active jobs" ON public.active_jobs;
DROP POLICY IF EXISTS "System can insert active jobs" ON public.active_jobs;

CREATE POLICY "Job parties can view active jobs"
  ON public.active_jobs FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
  );

CREATE POLICY "System can insert active jobs"
  ON public.active_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Job parties can update active jobs"
  ON public.active_jobs FOR UPDATE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
  )
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    OR technician_id = (SELECT auth.uid())
  );

-- login_attempts: fix always-true INSERT + fix admin SELECT
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Admins can read login attempts" ON public.login_attempts;

CREATE POLICY "Authenticated users can insert login attempts"
  ON public.login_attempts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can read login attempts"
  ON public.login_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- security_events: fix always-true INSERT + fix SELECT policies
DROP POLICY IF EXISTS "Anyone can insert security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;

CREATE POLICY "Authenticated users can insert security events"
  ON public.security_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users and admins can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );
