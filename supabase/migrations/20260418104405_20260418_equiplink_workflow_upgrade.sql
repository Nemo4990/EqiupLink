/*
  # EquipLink workflow upgrade

  Adds required fields and new tables to support the upgraded EquipLink platform:
  - Enhanced mechanic verification registration
  - Admin-mediated breakdown dispatch workflow (owner -> admin -> quote -> payment -> dispatch)
  - Preventive Maintenance (PM) kits catalog

  1. Modified Tables
    - `mechanic_verification_profiles`: add brand_experience (jsonb), field_service_years (int),
      professional_certificates (jsonb), license_type (text), employment_duration (text),
      verification_status (text), full_name (text)
    - `breakdown_requests`: add machine_serial (text), error_codes (text),
      dispatch_status (text), admin_id (uuid), quote_amount (numeric), quote_description (text),
      quote_sent_at, quote_accepted_at, payment_secured_at, dispatched_at timestamps

  2. New Tables
    - `pm_kits`: id, brand, model, category, name, description, price, parts_list (jsonb),
      image_url, is_active, sort_order, created_by, timestamps

  3. Security
    - RLS enabled on pm_kits
    - Public read on active pm_kits
    - Admin-only write on pm_kits
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='brand_experience') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN brand_experience jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='field_service_years') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN field_service_years integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='professional_certificates') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN professional_certificates jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='license_type') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN license_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='employment_duration') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN employment_duration text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='verification_status') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN verification_status text DEFAULT 'pending_verification';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mechanic_verification_profiles' AND column_name='full_name') THEN
    ALTER TABLE mechanic_verification_profiles ADD COLUMN full_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='machine_serial') THEN
    ALTER TABLE breakdown_requests ADD COLUMN machine_serial text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='error_codes') THEN
    ALTER TABLE breakdown_requests ADD COLUMN error_codes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='dispatch_status') THEN
    ALTER TABLE breakdown_requests ADD COLUMN dispatch_status text DEFAULT 'pending_admin_review';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='admin_id') THEN
    ALTER TABLE breakdown_requests ADD COLUMN admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='quote_amount') THEN
    ALTER TABLE breakdown_requests ADD COLUMN quote_amount numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='quote_description') THEN
    ALTER TABLE breakdown_requests ADD COLUMN quote_description text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='quote_sent_at') THEN
    ALTER TABLE breakdown_requests ADD COLUMN quote_sent_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='quote_accepted_at') THEN
    ALTER TABLE breakdown_requests ADD COLUMN quote_accepted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='payment_secured_at') THEN
    ALTER TABLE breakdown_requests ADD COLUMN payment_secured_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='breakdown_requests' AND column_name='dispatched_at') THEN
    ALTER TABLE breakdown_requests ADD COLUMN dispatched_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_breakdown_requests_dispatch_status ON breakdown_requests(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_admin_id ON breakdown_requests(admin_id);

CREATE TABLE IF NOT EXISTS pm_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  parts_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pm_kits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view active PM kits" ON pm_kits;
  CREATE POLICY "Anyone can view active PM kits"
    ON pm_kits FOR SELECT
    TO authenticated
    USING (is_active = true OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can insert PM kits" ON pm_kits;
  CREATE POLICY "Admins can insert PM kits"
    ON pm_kits FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can update PM kits" ON pm_kits;
  CREATE POLICY "Admins can update PM kits"
    ON pm_kits FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));

  DROP POLICY IF EXISTS "Admins can delete PM kits" ON pm_kits;
  CREATE POLICY "Admins can delete PM kits"
    ON pm_kits FOR DELETE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    ));
END $$;

INSERT INTO pm_kits (brand, model, category, name, description, price, parts_list, sort_order) VALUES
  ('CAT', '320D', '250_hour', '250 Hour PM Kit - CAT 320D', 'Engine oil, oil filter, fuel filters, air filters', 8500, '["Engine Oil 15W-40", "Oil Filter", "Fuel Filter", "Primary Air Filter", "Secondary Air Filter"]'::jsonb, 1),
  ('Komatsu', 'PC200', '500_hour', '500 Hour PM Kit - Komatsu PC200', 'Complete fluid & filter service kit', 11200, '["Engine Oil", "Hydraulic Oil Filter", "Fuel Filter Set", "Air Filter Set", "Transmission Filter"]'::jsonb, 2),
  ('Hyundai', 'R220', '250_hour', '250 Hour PM Kit - Hyundai R220', 'Scheduled maintenance kit', 7900, '["Engine Oil", "Oil Filter", "Fuel Filter", "Air Cleaner"]'::jsonb, 3),
  ('Doosan', 'DX225', '500_hour', '500 Hour PM Kit - Doosan DX225', 'Full service maintenance kit', 10800, '["Engine Oil", "Filter Set", "Hydraulic Breather"]'::jsonb, 4),
  ('JCB', '3CX', '250_hour', '250 Hour PM Kit - JCB 3CX', 'Backhoe loader service kit', 6800, '["Engine Oil", "Oil Filter", "Fuel Filter", "Air Filter"]'::jsonb, 5),
  ('Hitachi', 'ZX200', '1000_hour', '1000 Hour Major PM Kit - Hitachi ZX200', 'Major interval service kit', 18500, '["Engine Oil", "Hydraulic Oil", "All Filters", "Coolant"]'::jsonb, 6)
ON CONFLICT DO NOTHING;
