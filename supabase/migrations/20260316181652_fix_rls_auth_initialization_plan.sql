/*
  # Fix RLS auth() re-evaluation performance

  Replace `auth.uid()` and `auth.jwt()` with `(select auth.uid())` and `(select auth.jwt())`
  in all RLS policies to prevent per-row re-evaluation. This is a Postgres optimization
  that evaluates the function once per query instead of once per row.

  Tables fixed:
  - profiles
  - mechanic_profiles
  - supplier_profiles
  - rental_provider_profiles
  - machines
  - breakdown_requests
  - parts_listings
  - equipment_rentals
  - reviews
  - messages
  - notifications
  - service_history
  - commission_fees
  - user_payments
  - contact_credits
  - contact_history
  - payment_methods
  - contact_settings
  - site_stats
*/

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- mechanic_profiles
DROP POLICY IF EXISTS "Mechanics can insert own profile" ON public.mechanic_profiles;
DROP POLICY IF EXISTS "Mechanics can update own profile" ON public.mechanic_profiles;

CREATE POLICY "Mechanics can insert own profile"
  ON public.mechanic_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Mechanics can update own profile"
  ON public.mechanic_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- supplier_profiles
DROP POLICY IF EXISTS "Suppliers can insert own profile" ON public.supplier_profiles;
DROP POLICY IF EXISTS "Suppliers can update own profile" ON public.supplier_profiles;

CREATE POLICY "Suppliers can insert own profile"
  ON public.supplier_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Suppliers can update own profile"
  ON public.supplier_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- rental_provider_profiles
DROP POLICY IF EXISTS "Providers can insert own profile" ON public.rental_provider_profiles;
DROP POLICY IF EXISTS "Providers can update own profile" ON public.rental_provider_profiles;

CREATE POLICY "Providers can insert own profile"
  ON public.rental_provider_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Providers can update own profile"
  ON public.rental_provider_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- machines
DROP POLICY IF EXISTS "Owners can view own machines" ON public.machines;
DROP POLICY IF EXISTS "Owners can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Owners can update own machines" ON public.machines;
DROP POLICY IF EXISTS "Owners can delete own machines" ON public.machines;

CREATE POLICY "Owners can view own machines"
  ON public.machines FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can insert machines"
  ON public.machines FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can update own machines"
  ON public.machines FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can delete own machines"
  ON public.machines FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = owner_id);

-- breakdown_requests
DROP POLICY IF EXISTS "Owners can view own requests" ON public.breakdown_requests;
DROP POLICY IF EXISTS "Owners can insert requests" ON public.breakdown_requests;
DROP POLICY IF EXISTS "Owners can update own requests" ON public.breakdown_requests;

CREATE POLICY "Owners can view own requests"
  ON public.breakdown_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can insert requests"
  ON public.breakdown_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can update own requests"
  ON public.breakdown_requests FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- parts_listings
DROP POLICY IF EXISTS "Suppliers can view own listings" ON public.parts_listings;
DROP POLICY IF EXISTS "Suppliers can insert listings" ON public.parts_listings;
DROP POLICY IF EXISTS "Suppliers can update own listings" ON public.parts_listings;
DROP POLICY IF EXISTS "Suppliers can delete own listings" ON public.parts_listings;
DROP POLICY IF EXISTS "Suppliers can insert part listings" ON public.parts_listings;

CREATE POLICY "Suppliers can view own listings"
  ON public.parts_listings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = supplier_id);

CREATE POLICY "Suppliers can insert listings"
  ON public.parts_listings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = supplier_id);

CREATE POLICY "Suppliers can update own listings"
  ON public.parts_listings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = supplier_id)
  WITH CHECK ((select auth.uid()) = supplier_id);

CREATE POLICY "Suppliers can delete own listings"
  ON public.parts_listings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = supplier_id);

-- equipment_rentals
DROP POLICY IF EXISTS "Providers can view own rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Providers can insert rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Providers can update own rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Providers can delete own rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Rental providers can insert equipment rentals" ON public.equipment_rentals;

CREATE POLICY "Providers can view own rentals"
  ON public.equipment_rentals FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can insert rentals"
  ON public.equipment_rentals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can update own rentals"
  ON public.equipment_rentals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = provider_id)
  WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can delete own rentals"
  ON public.equipment_rentals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = provider_id);

-- reviews
DROP POLICY IF EXISTS "Owners can insert reviews" ON public.reviews;

CREATE POLICY "Owners can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = reviewer_id);

-- messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = sender_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = sender_id)
  WITH CHECK ((select auth.uid()) = sender_id);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- service_history
DROP POLICY IF EXISTS "Owners can view own service history" ON public.service_history;
DROP POLICY IF EXISTS "Mechanics can view service history they worked on" ON public.service_history;
DROP POLICY IF EXISTS "Owners can insert service history" ON public.service_history;
DROP POLICY IF EXISTS "Owners can update own service history" ON public.service_history;

CREATE POLICY "Owners can view own service history"
  ON public.service_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Mechanics can view service history they worked on"
  ON public.service_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = mechanic_id);

CREATE POLICY "Owners can insert service history"
  ON public.service_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Owners can update own service history"
  ON public.service_history FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- commission_fees
DROP POLICY IF EXISTS "Admins can manage fees" ON public.commission_fees;

CREATE POLICY "Admins can manage fees"
  ON public.commission_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- user_payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.user_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.user_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.user_payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.user_payments;

CREATE POLICY "Users can view own payments"
  ON public.user_payments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.user_payments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.user_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payments"
  ON public.user_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- contact_credits
DROP POLICY IF EXISTS "Users can view own credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.contact_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.contact_credits;

CREATE POLICY "Users can view own credits"
  ON public.contact_credits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own credits"
  ON public.contact_credits FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all credits"
  ON public.contact_credits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- contact_history
DROP POLICY IF EXISTS "Users can view own contact history" ON public.contact_history;
DROP POLICY IF EXISTS "Users can insert contact history" ON public.contact_history;

CREATE POLICY "Users can view own contact history"
  ON public.contact_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert contact history"
  ON public.contact_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- payment_methods
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can insert payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.payment_methods;

CREATE POLICY "Admins can view all payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert payment methods"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment methods"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete payment methods"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- contact_settings
DROP POLICY IF EXISTS "Admins can update contact settings" ON public.contact_settings;

CREATE POLICY "Admins can update contact settings"
  ON public.contact_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- site_stats
DROP POLICY IF EXISTS "Admins can insert site stats" ON public.site_stats;
DROP POLICY IF EXISTS "Admins can update site stats" ON public.site_stats;
DROP POLICY IF EXISTS "Admins can delete site stats" ON public.site_stats;

CREATE POLICY "Admins can insert site stats"
  ON public.site_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update site stats"
  ON public.site_stats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete site stats"
  ON public.site_stats FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );
