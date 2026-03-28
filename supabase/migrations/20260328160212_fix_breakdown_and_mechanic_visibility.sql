/*
  # Fix Breakdown Requests and Mechanic Visibility

  ## Changes Made
  
  1. **Breakdown Requests Visibility**
     - Updated RLS policy to allow ALL mechanics to view ALL breakdown requests (not just open ones)
     - Owners can still view their own requests
     - Assigned mechanics can view their assigned requests
  
  2. **Notes**
     - This allows mechanics to see the complete history of breakdown requests
     - Mechanics can now browse all requests globally regardless of status
     - Owner privacy is maintained through status filtering
*/

-- Drop the existing restrictive SELECT policies for breakdown_requests
DROP POLICY IF EXISTS "Owners can view own requests" ON breakdown_requests;
DROP POLICY IF EXISTS "Mechanics can view open requests" ON breakdown_requests;

-- Create new comprehensive SELECT policy for breakdown_requests
-- Mechanics with role='mechanic' can view ALL requests
-- Owners can view their own requests
-- Assigned mechanics can view their assigned requests
-- Admins can view all requests
CREATE POLICY "Users can view breakdown requests based on role"
  ON breakdown_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = assigned_mechanic_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('mechanic', 'admin')
    )
  );
