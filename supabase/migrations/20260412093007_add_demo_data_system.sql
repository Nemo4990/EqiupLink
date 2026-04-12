/*
  # Add Demo Data System

  Adds is_demo flag columns to profiles, parts_listings, and equipment_rentals
  so admins can identify and toggle mock/seed data visibility.
  Also inserts a platform_config entry for demo_mode_enabled.

  1. Changes
    - profiles.is_demo (boolean, default false)
    - parts_listings.is_demo (boolean, default false)
    - equipment_rentals.is_demo (boolean, default false)
    - platform_config row: demo_mode_enabled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts_listings' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.parts_listings ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.equipment_rentals ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
END $$;

INSERT INTO public.platform_config (config_key, config_value, config_label, description, updated_by)
VALUES ('demo_mode_enabled', 'true', 'Demo Mode', 'Show mock/seed listings and mechanics to make the platform feel live', NULL)
ON CONFLICT (config_key) DO NOTHING;
