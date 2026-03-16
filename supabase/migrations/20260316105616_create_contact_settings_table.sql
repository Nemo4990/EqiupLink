/*
  # Create Contact Settings Table

  ## Summary
  Adds a contact_settings table to store the platform's contact information
  that is displayed in the footer. The admin can manage these settings.

  ## New Tables
  - `contact_settings`
    - `id` (uuid, primary key)
    - `email` (text) - support email address
    - `phone` (text) - contact phone number
    - `address` (text) - physical/mailing address
    - `facebook_url` (text) - Facebook page URL
    - `twitter_url` (text) - Twitter/X profile URL
    - `linkedin_url` (text) - LinkedIn page URL
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Everyone can read contact settings (public info)
  - Only admins can update contact settings

  ## Seed Data
  - Default contact info inserted
*/

CREATE TABLE IF NOT EXISTS contact_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text DEFAULT 'support@equiplink.com',
  phone text DEFAULT '+1 (800) 555-0123',
  address text DEFAULT 'Houston, TX 77002',
  facebook_url text DEFAULT '',
  twitter_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contact settings"
  ON contact_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read contact settings"
  ON contact_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can update contact settings"
  ON contact_settings
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

INSERT INTO contact_settings (email, phone, address, facebook_url, twitter_url, linkedin_url)
VALUES ('support@equiplink.com', '+1 (800) 555-0123', 'Houston, TX 77002', '', '', '')
ON CONFLICT DO NOTHING;
