/*
  # Add platform_config table for text-based settings

  ## Problem
  The existing platform_settings table has a numeric setting_value column
  which cannot store text values like 'promo', dates, or messages.

  ## Solution
  Create a new platform_config table with a text value column for all
  non-numeric platform configuration including the promotional period controls.

  ## New Tables
  - `platform_config` — key/value store with text values for platform config

  ## Security
  - Enable RLS
  - Admins can read and write
  - All authenticated users can read (so the app can check promo mode)
*/

CREATE TABLE IF NOT EXISTS platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  config_label text,
  description text,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert platform config"
  ON platform_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update platform config"
  ON platform_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

INSERT INTO platform_config (config_key, config_value, config_label, description)
VALUES
  (
    'monetization_mode',
    'promo',
    'Monetization Mode',
    'Master switch: promo = all features free, paid = normal billing enforced'
  ),
  (
    'promo_mode_enabled',
    'true',
    'Promo Mode Active',
    'Whether the promotional free-access period is currently active'
  ),
  (
    'promo_start_date',
    '2026-04-11',
    'Promo Start Date',
    'ISO date (YYYY-MM-DD) when the promotional period started'
  ),
  (
    'promo_end_date',
    '2026-07-11',
    'Promo End Date',
    'ISO date (YYYY-MM-DD) when the promotional period is scheduled to end'
  ),
  (
    'promo_message',
    'EquipLink is FREE during our launch promotional period! Enjoy unlimited access to all features.',
    'Promo Banner Message',
    'Message displayed to users while the promotional period is active'
  )
ON CONFLICT (config_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_platform_config_key ON platform_config(config_key);
