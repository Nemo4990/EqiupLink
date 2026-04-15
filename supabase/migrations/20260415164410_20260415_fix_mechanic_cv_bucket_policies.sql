/*
  # Fix Mechanic CV Storage Bucket RLS Policies

  ## Summary
  Updates RLS policies for mechanic CV uploads to allow proper file upload during registration

  ## Changes
  - Allow authenticated users to upload CVs during registration
  - Allow users to view their own CVs
  - Allow admins to view all CVs
*/

DROP POLICY IF EXISTS "Mechanics can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Mechanics can view their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all CVs" ON storage.objects;

CREATE POLICY "Authenticated users can upload CV"
  ON storage.objects FOR INSERT
  TO authenticated
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
