/*
  # Add admin UPDATE policy for mechanic_profiles

  ## Problem
  The existing UPDATE policy on mechanic_profiles only allows mechanics to update
  their own profile (auth.uid() = user_id). Admins have no UPDATE access, so
  verification actions (setting is_verified, verified_at, verified_by, verification_notes)
  are silently rejected by RLS without returning an error.

  ## Changes
  - Add a new UPDATE policy allowing admins to update any mechanic profile
    (used for verification approval/rejection)

  ## Security
  - Policy is restricted to authenticated users whose profile has role = 'admin'
  - Does not grant admins access to non-mechanic profile updates
*/

CREATE POLICY "Admins can update mechanic profiles"
  ON mechanic_profiles FOR UPDATE
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
