/*
  # Restrict Storage Bucket Public Listing Access

  1. Security Hardening
    - Remove public SELECT policy that allows listing all files in listing-photos bucket
    - Public buckets don't need listing policies for object URL access
    - Prevent unintended data exposure through file enumeration

  2. Changes
    - Drop "Anyone can view listing photos" policy
    - Users can still access photos via signed URLs or authenticated requests
    - Prevents malicious enumeration of all listing photos
*/

DROP POLICY IF EXISTS "Anyone can view listing photos" ON storage.objects;
