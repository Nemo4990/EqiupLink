/*
  # Create Mechanic CV Storage Bucket

  ## Summary
  Creates a storage bucket for mechanic CV uploads with RLS policies

  ## Storage Buckets
  - `mechanic-cvs`: Stores CV files uploaded during verification
*/

INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('mechanic-cvs', 'mechanic-cvs', false, now(), now())
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Mechanics can upload their own CV"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mechanic-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Mechanics can view their own CV"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'mechanic-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

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
