/*
  # Fix RLS auth function performance issues

  Resolves 36 auth RLS initialization plan warnings by using SELECT subqueries
  instead of direct function calls. This prevents re-evaluation of auth functions
  for each row and significantly improves query performance at scale.
  
  1. Modified Tables and Policies
    - `diagnostics`: 2 policies updated
    - `diagnostics_history`: 3 policies updated
    - `mechanic_verification_profiles`: 4 policies updated
    - `email_delivery_logs`: 1 policy updated
    - `watermark_settings`: 4 policies updated
    - `parts_listings`: 1 policy updated
    - `email_broadcasts`: 3 policies updated
    - `email_logs`: 1 policy updated
    - `password_reset_tokens`: 2 policies updated
    - `job_postings`: 6 policies updated
    - `job_matches`: 4 policies updated
    - `job_acceptances`: 5 policies updated
    - `job_status_updates`: 3 policies updated
    - `job_ratings`: 4 policies updated

  2. Performance Impact
    - Eliminates repeated function calls per-row
    - Uses single SELECT call per query instead of one per row
    - Significantly reduces database overhead at scale
*/

DO $$
BEGIN
  -- diagnostics
  DROP POLICY IF EXISTS "Users can insert own diagnostics" ON diagnostics;
  CREATE POLICY "Users can insert own diagnostics"
    ON diagnostics FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can view own diagnostics" ON diagnostics;
  CREATE POLICY "Users can view own diagnostics"
    ON diagnostics FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

  -- diagnostics_history
  DROP POLICY IF EXISTS "Admins can view all diagnostics" ON diagnostics_history;
  CREATE POLICY "Admins can view all diagnostics"
    ON diagnostics_history FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Users can insert own diagnostics" ON diagnostics_history;
  CREATE POLICY "Users can insert own diagnostics"
    ON diagnostics_history FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can view own diagnostics" ON diagnostics_history;
  CREATE POLICY "Users can view own diagnostics"
    ON diagnostics_history FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

  -- mechanic_verification_profiles
  DROP POLICY IF EXISTS "Admins can update verification profiles" ON mechanic_verification_profiles;
  CREATE POLICY "Admins can update verification profiles"
    ON mechanic_verification_profiles FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can view all verification profiles" ON mechanic_verification_profiles;
  CREATE POLICY "Admins can view all verification profiles"
    ON mechanic_verification_profiles FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Mechanics can update own verification profile" ON mechanic_verification_profiles;
  CREATE POLICY "Mechanics can update own verification profile"
    ON mechanic_verification_profiles FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Mechanics can view own verification profile" ON mechanic_verification_profiles;
  CREATE POLICY "Mechanics can view own verification profile"
    ON mechanic_verification_profiles FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

  -- email_delivery_logs
  DROP POLICY IF EXISTS "Admins can view all email logs" ON email_delivery_logs;
  CREATE POLICY "Admins can view all email logs"
    ON email_delivery_logs FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  -- watermark_settings
  DROP POLICY IF EXISTS "Users can create own watermark settings" ON watermark_settings;
  CREATE POLICY "Users can create own watermark settings"
    ON watermark_settings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can delete own watermark settings" ON watermark_settings;
  CREATE POLICY "Users can delete own watermark settings"
    ON watermark_settings FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can update own watermark settings" ON watermark_settings;
  CREATE POLICY "Users can update own watermark settings"
    ON watermark_settings FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can view own watermark settings" ON watermark_settings;
  CREATE POLICY "Users can view own watermark settings"
    ON watermark_settings FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

  -- parts_listings
  DROP POLICY IF EXISTS "Admins can update any parts listing" ON parts_listings;
  CREATE POLICY "Admins can update any parts listing"
    ON parts_listings FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  -- email_broadcasts
  DROP POLICY IF EXISTS "Only admins can create broadcasts" ON email_broadcasts;
  CREATE POLICY "Only admins can create broadcasts"
    ON email_broadcasts FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Only admins can update broadcasts" ON email_broadcasts;
  CREATE POLICY "Only admins can update broadcasts"
    ON email_broadcasts FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Only admins can view broadcasts" ON email_broadcasts;
  CREATE POLICY "Only admins can view broadcasts"
    ON email_broadcasts FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  -- email_logs
  DROP POLICY IF EXISTS "Only admins can view email logs" ON email_logs;
  CREATE POLICY "Only admins can view email logs"
    ON email_logs FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  -- password_reset_tokens
  DROP POLICY IF EXISTS "Users can delete their password reset tokens" ON password_reset_tokens;
  CREATE POLICY "Users can delete their password reset tokens"
    ON password_reset_tokens FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Users can view their own password reset tokens" ON password_reset_tokens;
  CREATE POLICY "Users can view their own password reset tokens"
    ON password_reset_tokens FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));

  -- job_postings
  DROP POLICY IF EXISTS "Admins can assign mechanics to jobs" ON job_postings;
  CREATE POLICY "Admins can assign mechanics to jobs"
    ON job_postings FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can view all jobs" ON job_postings;
  CREATE POLICY "Admins can view all jobs"
    ON job_postings FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Assigned mechanics can view their jobs" ON job_postings;
  CREATE POLICY "Assigned mechanics can view their jobs"
    ON job_postings FOR SELECT
    TO authenticated
    USING (assigned_mechanic_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can create jobs" ON job_postings;
  CREATE POLICY "Owners can create jobs"
    ON job_postings FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can update own jobs" ON job_postings;
  CREATE POLICY "Owners can update own jobs"
    ON job_postings FOR UPDATE
    TO authenticated
    USING (owner_id = (select auth.uid()))
    WITH CHECK (owner_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can view own jobs" ON job_postings;
  CREATE POLICY "Owners can view own jobs"
    ON job_postings FOR SELECT
    TO authenticated
    USING (owner_id = (select auth.uid()));

  -- job_matches
  DROP POLICY IF EXISTS "Admins can create matches" ON job_matches;
  CREATE POLICY "Admins can create matches"
    ON job_matches FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can view all matches" ON job_matches;
  CREATE POLICY "Admins can view all matches"
    ON job_matches FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Mechanics can update own match status" ON job_matches;
  CREATE POLICY "Mechanics can update own match status"
    ON job_matches FOR UPDATE
    TO authenticated
    USING (mechanic_id = (select auth.uid()))
    WITH CHECK (mechanic_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Mechanics can view matches for their jobs" ON job_matches;
  CREATE POLICY "Mechanics can view matches for their jobs"
    ON job_matches FOR SELECT
    TO authenticated
    USING (mechanic_id = (select auth.uid()));

  -- job_acceptances
  DROP POLICY IF EXISTS "Admins can view all acceptances" ON job_acceptances;
  CREATE POLICY "Admins can view all acceptances"
    ON job_acceptances FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Mechanics can insert acceptances" ON job_acceptances;
  CREATE POLICY "Mechanics can insert acceptances"
    ON job_acceptances FOR INSERT
    TO authenticated
    WITH CHECK (mechanic_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Mechanics can update own acceptances" ON job_acceptances;
  CREATE POLICY "Mechanics can update own acceptances"
    ON job_acceptances FOR UPDATE
    TO authenticated
    USING (mechanic_id = (select auth.uid()))
    WITH CHECK (mechanic_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Mechanics can view own acceptances" ON job_acceptances;
  CREATE POLICY "Mechanics can view own acceptances"
    ON job_acceptances FOR SELECT
    TO authenticated
    USING (mechanic_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can view acceptances for their jobs" ON job_acceptances;
  CREATE POLICY "Owners can view acceptances for their jobs"
    ON job_acceptances FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_acceptances.job_id
      AND job_postings.owner_id = (select auth.uid())
    ));

  -- job_status_updates
  DROP POLICY IF EXISTS "Admins can view all status updates" ON job_status_updates;
  CREATE POLICY "Admins can view all status updates"
    ON job_status_updates FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Mechanics can view status updates for their jobs" ON job_status_updates;
  CREATE POLICY "Mechanics can view status updates for their jobs"
    ON job_status_updates FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_status_updates.job_id
      AND job_postings.assigned_mechanic_id = (select auth.uid())
    ));

  DROP POLICY IF EXISTS "Owners can view status updates for their jobs" ON job_status_updates;
  CREATE POLICY "Owners can view status updates for their jobs"
    ON job_status_updates FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_status_updates.job_id
      AND job_postings.owner_id = (select auth.uid())
    ));

  -- job_ratings
  DROP POLICY IF EXISTS "Admins can view all ratings" ON job_ratings;
  CREATE POLICY "Admins can view all ratings"
    ON job_ratings FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Owners can create ratings" ON job_ratings;
  CREATE POLICY "Owners can create ratings"
    ON job_ratings FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can update their ratings" ON job_ratings;
  CREATE POLICY "Owners can update their ratings"
    ON job_ratings FOR UPDATE
    TO authenticated
    USING (owner_id = (select auth.uid()))
    WITH CHECK (owner_id = (select auth.uid()));

  DROP POLICY IF EXISTS "Owners can view ratings for their jobs" ON job_ratings;
  CREATE POLICY "Owners can view ratings for their jobs"
    ON job_ratings FOR SELECT
    TO authenticated
    USING (owner_id = (select auth.uid()));
END $$;
