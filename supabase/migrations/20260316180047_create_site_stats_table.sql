/*
  # Create site_stats table for admin-managed landing page statistics

  1. New Tables
    - `site_stats`
      - `id` (uuid, primary key)
      - `stat_key` (text, unique) - identifier like 'certified_mechanics'
      - `stat_value` (text) - display value like '12,000+'
      - `stat_label` (text) - display label like 'Certified Mechanics'
      - `sort_order` (integer) - display order on landing page
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `site_stats` table
    - Public read access for all users (stats are displayed on public landing page)
    - Only admin users can insert, update, and delete

  3. Seed Data
    - Pre-populate with 4 default statistics
*/

CREATE TABLE IF NOT EXISTS site_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text UNIQUE NOT NULL,
  stat_value text NOT NULL DEFAULT '',
  stat_label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site stats"
  ON site_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert site stats"
  ON site_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update site stats"
  ON site_stats
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete site stats"
  ON site_stats
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO site_stats (stat_key, stat_value, stat_label, sort_order) VALUES
  ('certified_mechanics', '12,000+', 'Certified Mechanics', 0),
  ('parts_listed', '45,000+', 'Parts Listed', 1),
  ('equipment_for_rent', '3,200+', 'Equipment for Rent', 2),
  ('satisfaction_rate', '98%', 'Satisfaction Rate', 3)
ON CONFLICT (stat_key) DO NOTHING;