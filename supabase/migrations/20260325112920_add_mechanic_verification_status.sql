/*
  # Add Mechanic Verification System

  ## Overview
  Adds admin-controlled verification status to mechanic profiles so that
  only admin-verified mechanics appear in the public marketplace.

  ## Changes
  - `mechanic_profiles`: adds `is_verified` boolean (default false), `verified_at` timestamp,
    `verified_by` uuid (admin), `verification_notes` text
  - `profiles`: adds `is_verified` boolean for general account verification

  ## Security
  - Only admins (via service role) should update is_verified
  - Mechanics and owners can SELECT is_verified but not update it

  ## Notes
  1. Existing mechanics default to unverified (false) — admin must explicitly verify them
  2. The marketplace query will add `.eq('is_verified', true)` filter
*/

ALTER TABLE mechanic_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_notes text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_is_verified ON mechanic_profiles(is_verified);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
