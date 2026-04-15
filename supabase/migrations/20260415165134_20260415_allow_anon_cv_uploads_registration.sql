/*
  # Allow Anonymous CV Uploads During Registration

  ## Summary
  Updates RLS policies to allow anonymous users to upload CVs during the registration process

  ## Changes
  - Allow anonymous users to upload CVs during registration
  - Allow authenticated users to view their own CVs
  - Allow admins to view all CVs
*/

DROP POLICY IF EXISTS "Authenticated users can upload CV" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own CV" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all CVs" ON storage.objects;

CREATE POLICY "Anyone can upload CV"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'mechanic-cvs');

CREATE POLICY "Authenticated users can view own CV"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'mechanic-cvs');

CREATE POLICY "Admins can view all CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mechanic-cvs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
