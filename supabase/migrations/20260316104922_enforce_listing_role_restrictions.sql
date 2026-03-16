/*
  # Enforce Role Restrictions on Listings

  ## Summary
  Restricts INSERT access on parts_listings and equipment_rentals tables so only
  users with the correct role can create listings.

  ## Changes
  - parts_listings: Only users with role 'supplier' can insert rows
  - equipment_rentals: Only users with role 'rental_provider' can insert rows

  ## Security
  - Both policies check auth.uid() matches the supplier_id/provider_id column
  - Both policies verify the user's role in the profiles table
  - Admins are excluded from restrictions
*/

DROP POLICY IF EXISTS "Suppliers can insert part listings" ON parts_listings;
CREATE POLICY "Suppliers can insert part listings"
  ON parts_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = supplier_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('supplier', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rental providers can insert equipment rentals" ON equipment_rentals;
CREATE POLICY "Rental providers can insert equipment rentals"
  ON equipment_rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('rental_provider', 'admin')
    )
  );
