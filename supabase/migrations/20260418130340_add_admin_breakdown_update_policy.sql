/*
  # Add Admin Update Policy for Breakdown Requests

  ## Problem
  Admins had no RLS UPDATE policy on the breakdown_requests table.
  This caused the Job Dispatch assignment flow to silently fail — when admin
  tried to assign a mechanic (setting assigned_mechanic_id, mechanic_offer_status, etc.),
  the update was rejected by RLS, leaving the mechanic with no visible job offers.

  ## Changes
  - Adds an admin UPDATE policy on breakdown_requests
  - Admins can update any breakdown request (assignment, dispatch_status, quote fields, etc.)
*/

CREATE POLICY "Admins can update any breakdown request"
  ON breakdown_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
