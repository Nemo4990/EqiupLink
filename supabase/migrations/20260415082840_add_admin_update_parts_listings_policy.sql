/*
  # Add Admin Update Policy for Parts Listings

  ## Summary
  Admins need to be able to update demo parts listings and their photo URLs.
  Currently, RLS policies only allow suppliers to update their own listings.
  This migration adds a policy allowing admins to update all parts listings.

  ## Changes
  - Add "Admins can update any parts listing" policy for UPDATE operations
  - Allows admin role to modify demo data including image_urls
*/

CREATE POLICY "Admins can update any parts listing"
  ON public.parts_listings FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
