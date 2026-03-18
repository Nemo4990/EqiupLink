/*
  # Add Legal Settings Table

  ## Summary
  Creates a `legal_settings` table for managing contact email addresses displayed
  on the Privacy Policy and Terms of Service pages.

  ## New Tables
  - `legal_settings`
    - `id` (uuid, primary key)
    - `privacy_email` (text) - Email displayed on the Privacy Policy page
    - `legal_email` (text) - Email displayed on the Terms of Service page
    - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled: public can SELECT (to render on legal pages), only admins can UPDATE/INSERT

  ## Notes
  1. A single row is seeded with default values
  2. Admins manage this via the Admin panel Legal tab
*/

CREATE TABLE IF NOT EXISTS legal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privacy_email text NOT NULL DEFAULT 'privacy@equiplink.et',
  legal_email text NOT NULL DEFAULT 'legal@equiplink.et',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read legal settings"
  ON legal_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can update legal settings"
  ON legal_settings FOR UPDATE
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

CREATE POLICY "Admins can insert legal settings"
  ON legal_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO legal_settings (privacy_email, legal_email)
VALUES ('privacy@equiplink.et', 'legal@equiplink.et')
ON CONFLICT DO NOTHING;
