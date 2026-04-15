/*
  # Consolidate multiple permissive policies

  Merges multiple SELECT policies for the same role using OR conditions to reduce
  policy complexity. This improves query performance and maintainability.

  1. Consolidated Tables
    - `diagnostics_history`: 2 SELECT policies merged into 1
    - `job_acceptances`: 3 SELECT policies merged into 1
    - `job_matches`: 2 SELECT policies merged into 1
    - `job_postings`: 3 SELECT policies merged into 1
    - `job_ratings`: 2 SELECT policies merged into 1
    - `job_status_updates`: 3 SELECT policies merged into 1
    - `mechanic_verification_profiles`: 2 SELECT policies and 2 UPDATE policies merged
    - `parts_listings`: 2 UPDATE policies merged into 1
    - `job_postings`: 2 UPDATE policies merged into 1

  2. Security Impact
    - Maintains equivalent security posture with simpler logic
    - Reduces policy evaluation overhead
    - Easier to audit and maintain
*/

DO $$
BEGIN
  -- diagnostics_history - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all diagnostics" ON diagnostics_history;
  DROP POLICY IF EXISTS "Users can view own diagnostics" ON diagnostics_history;
  CREATE POLICY "View diagnostics"
    ON diagnostics_history FOR SELECT
    TO authenticated
    USING (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_acceptances - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all acceptances" ON job_acceptances;
  DROP POLICY IF EXISTS "Mechanics can view own acceptances" ON job_acceptances;
  DROP POLICY IF EXISTS "Owners can view acceptances for their jobs" ON job_acceptances;
  CREATE POLICY "View acceptances"
    ON job_acceptances FOR SELECT
    TO authenticated
    USING (
      mechanic_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM job_postings
        WHERE job_postings.id = job_acceptances.job_id
        AND job_postings.owner_id = (select auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_matches - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all matches" ON job_matches;
  DROP POLICY IF EXISTS "Mechanics can view matches for their jobs" ON job_matches;
  CREATE POLICY "View matches"
    ON job_matches FOR SELECT
    TO authenticated
    USING (
      mechanic_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_postings - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all jobs" ON job_postings;
  DROP POLICY IF EXISTS "Assigned mechanics can view their jobs" ON job_postings;
  DROP POLICY IF EXISTS "Owners can view own jobs" ON job_postings;
  CREATE POLICY "View jobs"
    ON job_postings FOR SELECT
    TO authenticated
    USING (
      owner_id = (select auth.uid())
      OR assigned_mechanic_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_postings - consolidate UPDATE
  DROP POLICY IF EXISTS "Admins can assign mechanics to jobs" ON job_postings;
  DROP POLICY IF EXISTS "Owners can update own jobs" ON job_postings;
  CREATE POLICY "Update jobs"
    ON job_postings FOR UPDATE
    TO authenticated
    USING (
      owner_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      owner_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_ratings - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all ratings" ON job_ratings;
  DROP POLICY IF EXISTS "Owners can view ratings for their jobs" ON job_ratings;
  CREATE POLICY "View ratings"
    ON job_ratings FOR SELECT
    TO authenticated
    USING (
      owner_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- job_status_updates - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all status updates" ON job_status_updates;
  DROP POLICY IF EXISTS "Mechanics can view status updates for their jobs" ON job_status_updates;
  DROP POLICY IF EXISTS "Owners can view status updates for their jobs" ON job_status_updates;
  CREATE POLICY "View status updates"
    ON job_status_updates FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM job_postings
        WHERE job_postings.id = job_status_updates.job_id
        AND (
          job_postings.owner_id = (select auth.uid())
          OR job_postings.assigned_mechanic_id = (select auth.uid())
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- mechanic_verification_profiles - consolidate SELECT
  DROP POLICY IF EXISTS "Admins can view all verification profiles" ON mechanic_verification_profiles;
  DROP POLICY IF EXISTS "Mechanics can view own verification profile" ON mechanic_verification_profiles;
  CREATE POLICY "View verification profiles"
    ON mechanic_verification_profiles FOR SELECT
    TO authenticated
    USING (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- mechanic_verification_profiles - consolidate UPDATE
  DROP POLICY IF EXISTS "Admins can update verification profiles" ON mechanic_verification_profiles;
  DROP POLICY IF EXISTS "Mechanics can update own verification profile" ON mechanic_verification_profiles;
  CREATE POLICY "Update verification profiles"
    ON mechanic_verification_profiles FOR UPDATE
    TO authenticated
    USING (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );

  -- parts_listings - consolidate UPDATE
  DROP POLICY IF EXISTS "Admins can update any parts listing" ON parts_listings;
  DROP POLICY IF EXISTS "Suppliers can update own listings" ON parts_listings;
  CREATE POLICY "Update listings"
    ON parts_listings FOR UPDATE
    TO authenticated
    USING (
      supplier_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      supplier_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
      )
    );
END $$;
