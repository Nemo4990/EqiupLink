/*
  # Add multiple image support to parts_listings

  ## Changes
  - Adds `image_urls` (text[]) column to `parts_listings` for storing multiple photo URLs
  - `image_url` (the original single-image column) is kept for backwards compatibility
  - New listings should populate `image_urls`; `image_url` serves as the primary/cover photo

  ## Notes
  - Default is an empty array
  - No data migration needed — existing rows will have an empty array
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts_listings' AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE parts_listings ADD COLUMN image_urls text[] DEFAULT '{}';
  END IF;
END $$;
