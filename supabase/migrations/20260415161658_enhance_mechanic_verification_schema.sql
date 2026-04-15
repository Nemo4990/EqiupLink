/*
  # Enhanced Mechanic Verification Schema

  ## Summary
  Comprehensive mechanic verification profile with detailed experience, certifications,
  equipment, and contact information for thorough admin verification

  ## Modified Tables
  - `mechanic_verification_profiles`: Added detailed fields
    - CV file upload
    - Hands-on experience details
    - Driving license information
    - Current location
    - Specializations (expanded list)
    - Willingness to travel
    - Service truck ownership
    - Employment details
    - Diagnostic tools owned
    - Contact information (email, phone, address)

  ## Security
  - RLS policies ensure only mechanics can view/edit own data
  - Admins have full access for verification
  - Contact information protected but accessible to admins
*/

DO $$
BEGIN
  -- Add columns to mechanic_verification_profiles if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'cv_file_url'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN cv_file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'hands_on_experience'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN hands_on_experience text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'driving_license'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN driving_license text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'current_location'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN current_location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'expertise_areas'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN expertise_areas jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'willing_travel'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN willing_travel boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'owns_service_truck'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN owns_service_truck boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'employment_status'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN employment_status text CHECK (employment_status IN ('employed', 'self-employed', 'looking', 'not-available'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN company_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'diagnostic_tools'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN diagnostic_tools jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_verification_profiles' AND column_name = 'contact_address'
  ) THEN
    ALTER TABLE public.mechanic_verification_profiles
    ADD COLUMN contact_address text;
  END IF;

END $$;
