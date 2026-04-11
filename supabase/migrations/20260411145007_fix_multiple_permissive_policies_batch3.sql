/*
  # Fix Multiple Permissive Policies (Batch 3)

  Consolidates duplicate permissive SELECT/INSERT/UPDATE policies into single
  policies using OR conditions, eliminating redundant row-level evaluation.

  Tables fixed:
  - breakdown_requests (remove duplicate SELECT)
  - equipment_rentals (merge duplicate INSERT)
  - mechanic_profiles (merge duplicate UPDATE, column is user_id)
  - mechanic_rewards (merge duplicate SELECT)
  - notifications (merge duplicate INSERT)
  - profiles (merge duplicate UPDATE)
*/

-- ============================================================
-- breakdown_requests: remove duplicate SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view relevant breakdown requests" ON public.breakdown_requests;

-- ============================================================
-- equipment_rentals: merge duplicate INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert own rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Providers can insert rentals" ON public.equipment_rentals;

CREATE POLICY "Authenticated users can insert own rentals"
  ON public.equipment_rentals FOR INSERT TO authenticated
  WITH CHECK (provider_id = (SELECT auth.uid()));

-- ============================================================
-- mechanic_profiles: merge duplicate UPDATE policies (PK column: user_id)
-- ============================================================
DROP POLICY IF EXISTS "Admins can update mechanic profiles" ON public.mechanic_profiles;
DROP POLICY IF EXISTS "Mechanics can update own profile" ON public.mechanic_profiles;

CREATE POLICY "Mechanics or admins can update mechanic profiles"
  ON public.mechanic_profiles FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ============================================================
-- mechanic_rewards: merge duplicate SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "All authenticated can read rewards for leaderboard" ON public.mechanic_rewards;
DROP POLICY IF EXISTS "Mechanics can view own rewards" ON public.mechanic_rewards;

CREATE POLICY "Authenticated users can read mechanic rewards"
  ON public.mechanic_rewards FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- notifications: merge duplicate INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications for themselves" ON public.notifications;

CREATE POLICY "Users or admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ============================================================
-- profiles: merge duplicate UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users or admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  );
