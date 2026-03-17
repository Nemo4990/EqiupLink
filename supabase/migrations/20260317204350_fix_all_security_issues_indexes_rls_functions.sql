/*
  # Fix All Security Issues

  ## Summary
  1. Add covering indexes for all unindexed foreign keys
  2. Drop unused indexes (reduces write overhead)
  3. Consolidate multiple permissive policies into single policies
  4. Fix mutable search_path on forum functions to prevent injection
*/

-- ============================================================
-- SECTION 1: Add indexes for unindexed foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_active_jobs_customer_id ON public.active_jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_technician_id ON public.active_jobs (technician_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_listing_id ON public.boosted_listings (listing_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_supplier_id ON public.boosted_listings (supplier_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_assigned_mechanic_id ON public.breakdown_requests (assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_machine_id ON public.breakdown_requests (machine_id);
CREATE INDEX IF NOT EXISTS idx_commissions_technician_id ON public.commissions (technician_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_payment_id ON public.contact_history (payment_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_provider_id ON public.contact_history (provider_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_unlocker_id ON public.contact_unlocks (unlocker_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_provider_id ON public.equipment_rentals (provider_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_reply_id ON public.forum_replies (parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_breakdown_request_id ON public.job_unlocks (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON public.machines (owner_id);
CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON public.offers (customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_technician_id ON public.offers (technician_id);
CREATE INDEX IF NOT EXISTS idx_parts_listings_supplier_id ON public.parts_listings (supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotes_owner_id ON public.quotes (owner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_technician_id ON public.quotes (technician_id);
CREATE INDEX IF NOT EXISTS idx_rental_provider_profiles_user_id ON public.rental_provider_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_breakdown_request_id ON public.reviews (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mechanic_id ON public.reviews (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS idx_service_history_breakdown_request_id ON public.service_history (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_service_history_machine_id ON public.service_history (machine_id);
CREATE INDEX IF NOT EXISTS idx_service_history_mechanic_id ON public.service_history (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_service_history_owner_id ON public.service_history (owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_user_id ON public.supplier_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_provider_id ON public.user_payments (provider_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_reviewed_by ON public.user_payments (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions (wallet_id);

-- ============================================================
-- SECTION 2: Drop unused indexes
-- ============================================================

DROP INDEX IF EXISTS public.idx_equipment_brands_sort_order;
DROP INDEX IF EXISTS public.idx_equipment_brands_sort;
DROP INDEX IF EXISTS public.idx_forum_posts_author;
DROP INDEX IF EXISTS public.idx_forum_posts_created;
DROP INDEX IF EXISTS public.idx_forum_replies_post;
DROP INDEX IF EXISTS public.idx_forum_replies_author;
DROP INDEX IF EXISTS public.idx_forum_reactions_target;
DROP INDEX IF EXISTS public.idx_forum_reactions_user;
DROP INDEX IF EXISTS public.idx_active_jobs_offer_id;
DROP INDEX IF EXISTS public.idx_active_jobs_service_request_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_payment_id;
DROP INDEX IF EXISTS public.idx_commissions_owner_id;
DROP INDEX IF EXISTS public.idx_contact_unlocks_target_id;
DROP INDEX IF EXISTS public.idx_customer_contact_unlocks_payment_id;
DROP INDEX IF EXISTS public.idx_customer_contact_unlocks_technician_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_wallet_transaction_id;
DROP INDEX IF EXISTS public.idx_platform_settings_updated_by;
DROP INDEX IF EXISTS public.idx_subscriptions_payment_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_payment_id;

-- ============================================================
-- SECTION 3: Fix multiple permissive policies
-- ============================================================

-- breakdown_requests SELECT: merge "Mechanics can view open requests" + "Owners can view own requests"
DROP POLICY IF EXISTS "Mechanics can view open requests" ON public.breakdown_requests;
DROP POLICY IF EXISTS "Owners can view own requests" ON public.breakdown_requests;
CREATE POLICY "Users can view relevant breakdown requests"
  ON public.breakdown_requests FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mechanic'
  );

-- commission_fees: merge admin + public view into one SELECT, keep separate admin write
DROP POLICY IF EXISTS "Admins can manage fees" ON public.commission_fees;
DROP POLICY IF EXISTS "Anyone can view active fees" ON public.commission_fees;
CREATE POLICY "Authenticated users can view commission fees"
  ON public.commission_fees FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admins can manage commission fees"
  ON public.commission_fees FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can insert commission fees"
  ON public.commission_fees FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can delete commission fees"
  ON public.commission_fees FOR DELETE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- contact_credits: merge duplicate policies
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.contact_credits;
DROP POLICY IF EXISTS "System can insert credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.contact_credits;
CREATE POLICY "Users can view own contact credits"
  ON public.contact_credits FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Admins can insert contact credits"
  ON public.contact_credits FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Users can update own contact credits"
  ON public.contact_credits FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Admins can delete contact credits"
  ON public.contact_credits FOR DELETE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- equipment_brands SELECT: merge admin view + public view
DROP POLICY IF EXISTS "Admins can view all brands" ON public.equipment_brands;
DROP POLICY IF EXISTS "Anyone can view active brands" ON public.equipment_brands;
CREATE POLICY "Authenticated users can view equipment brands"
  ON public.equipment_brands FOR SELECT
  TO authenticated
  USING (true);

-- equipment_rentals SELECT: merge "Anyone can view available" + "Providers can view own"
DROP POLICY IF EXISTS "Anyone can view available rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Providers can view own rentals" ON public.equipment_rentals;
CREATE POLICY "Authenticated users can view equipment rentals"
  ON public.equipment_rentals FOR SELECT
  TO authenticated
  USING (
    is_available = true
    OR provider_id = auth.uid()
  );

-- parts_listings SELECT: merge "Anyone can view active" + "Suppliers can view own"
DROP POLICY IF EXISTS "Anyone can view active parts listings" ON public.parts_listings;
DROP POLICY IF EXISTS "Suppliers can view own listings" ON public.parts_listings;
CREATE POLICY "Authenticated users can view parts listings"
  ON public.parts_listings FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR supplier_id = auth.uid()
  );

-- payment_methods SELECT: merge admin + public view
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Authenticated users can view active payment methods" ON public.payment_methods;
CREATE POLICY "Authenticated users can view payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (true);

-- service_history SELECT: merge mechanic + owner views
DROP POLICY IF EXISTS "Mechanics can view service history they worked on" ON public.service_history;
DROP POLICY IF EXISTS "Owners can view own service history" ON public.service_history;
CREATE POLICY "Users can view relevant service history"
  ON public.service_history FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR mechanic_id = auth.uid()
  );

-- user_payments SELECT: merge admin + own view
DROP POLICY IF EXISTS "Admins can view all payments" ON public.user_payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.user_payments;
CREATE POLICY "Users can view own or all payments"
  ON public.user_payments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- SECTION 4: Fix mutable search_path in forum functions
-- Trigger functions (no args) and the view-count function (p_post_id uuid)
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_forum_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_posts
  SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_forum_reply_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_posts
  SET reply_count = GREATEST(reply_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_forum_view_count(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;
END;
$$;
