/*
  # Allow anonymous trade license uploads during registration

  ## Problem
  During supplier account registration, the user is not yet authenticated.
  The existing storage policy for listing-photos only allows authenticated users to upload.
  This causes "Failed to upload" when trying to attach a trade license photo before signup.

  ## Solution
  Add a storage INSERT policy that allows anonymous (unauthenticated) users to upload
  to a specific prefix path: `trade-license-temp/` inside the `listing-photos` bucket.
  Files under this path are treated as temporary pre-signup uploads.

  After signup, the file URL is saved to supplier_documents and can be moved/archived.

  ## Security Notes
  - Only INSERT is allowed for anon on this prefix (not SELECT, UPDATE, DELETE)
  - The bucket is already public so files are readable (needed to display the preview)
  - Files are scoped to a specific path prefix to limit surface area
*/

CREATE POLICY "Anon can upload trade license temp files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = 'trade-license-temp'
  );
