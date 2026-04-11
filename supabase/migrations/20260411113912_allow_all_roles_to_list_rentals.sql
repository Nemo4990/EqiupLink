/*
  # Allow all authenticated users to insert rental listings

  1. Changes
    - Drops the existing role-restricted INSERT policy on equipment_rentals
    - Recreates it allowing any authenticated user to insert (provider_id must match their own uid)

  2. Reason
    - Previously only rental_provider and admin roles could create rental listings
    - Business requirement changed: mechanics, owners, and suppliers should also be able to list rentals
*/

DROP POLICY IF EXISTS "Only rental providers can insert rentals" ON public.equipment_rentals;

CREATE POLICY "Authenticated users can insert own rentals"
  ON public.equipment_rentals
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = provider_id);
