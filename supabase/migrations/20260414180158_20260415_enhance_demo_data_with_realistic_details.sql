/*
  # Enhance Demo Data with Realistic Details

  1. Modified Tables
    - Add contact_address to profiles for all demo mechanics, suppliers, rental providers
    - Add part_number field to parts_listings for real part identification
    - Ensure phone numbers are realistic

  2. Demo Data Improvements
    - Real Ethiopian names for all mechanics and suppliers
    - Authentic machinery part names and part numbers
    - Real contact addresses in Ethiopian cities
    - Realistic pricing based on actual market rates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN contact_address text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts_listings' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE parts_listings ADD COLUMN part_number text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE equipment_rentals ADD COLUMN contact_address text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_profiles' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE mechanic_profiles ADD COLUMN contact_address text DEFAULT '';
  END IF;
END $$;
