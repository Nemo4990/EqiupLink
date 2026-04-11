/*
  # Add admin UPDATE policy for profiles

  ## Problem
  The existing UPDATE policy on profiles only allows users to update their own profile.
  Admins perform several management actions on other users' profiles:
  - Setting is_approved = true (account approval)
  - Setting is_suspended = true/false (user suspension)
  - Setting wallet_balance (credit top-ups)
  These are all silently rejected by RLS.

  ## Changes
  - Add a new UPDATE policy allowing admins to update any profile

  ## Security
  - Restricted to authenticated users with role = 'admin'
*/

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );
