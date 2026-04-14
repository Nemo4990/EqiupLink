/*
  # Enhance Demo Data System and Promo Notifications

  1. New Tables
    - `demo_listing_photos` - Store URLs for demo listing images managed by admin
    - `user_promo_notifications` - Track dismissed promo notifications per user

  2. Modified Tables
    - `parts_listings` - Add photo_urls JSON array for demo parts with images
    - `equipment_rentals` - Add photo_urls JSON array for demo rentals with images
    - `platform_config` - Add new config for demo mechanics count and demo suppliers count

  3. Security
    - Enable RLS on new tables
    - Add policies for admin access to photos
    - Add policies for users to track their dismissed notifications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'demo_listing_photos'
  ) THEN
    CREATE TABLE demo_listing_photos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_type text NOT NULL CHECK (listing_type IN ('part', 'rental', 'mechanic')),
      listing_id uuid NOT NULL,
      photo_url text NOT NULL,
      display_order int DEFAULT 0,
      uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_demo_listing_photos_listing ON demo_listing_photos(listing_type, listing_id);
    CREATE INDEX idx_demo_listing_photos_uploaded_by ON demo_listing_photos(uploaded_by);

    ALTER TABLE demo_listing_photos ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins can manage demo listing photos"
      ON demo_listing_photos FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_promo_notifications'
  ) THEN
    CREATE TABLE user_promo_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      dismissed_at timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );

    CREATE UNIQUE INDEX idx_user_promo_dismissed_once ON user_promo_notifications(user_id);
    CREATE INDEX idx_user_promo_created_at ON user_promo_notifications(created_at);

    ALTER TABLE user_promo_notifications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can read own promo notification status"
      ON user_promo_notifications FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can dismiss promo notification"
      ON user_promo_notifications FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts_listings' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE parts_listings ADD COLUMN photo_urls text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_rentals' AND column_name = 'photo_urls'
  ) THEN
    ALTER TABLE equipment_rentals ADD COLUMN photo_urls text[] DEFAULT '{}';
  END IF;
END $$;

INSERT INTO public.platform_config (config_key, config_value, config_label, description, updated_by)
VALUES 
  ('demo_suppliers_target', '250', 'Target Demo Suppliers', 'Target number of demo suppliers to display', NULL),
  ('demo_mechanics_target', '1000', 'Target Demo Mechanics', 'Target number of demo mechanics to display', NULL),
  ('demo_parts_listings_per_supplier', '20', 'Demo Parts per Supplier', 'Average number of demo parts per supplier', NULL)
ON CONFLICT (config_key) DO NOTHING;
