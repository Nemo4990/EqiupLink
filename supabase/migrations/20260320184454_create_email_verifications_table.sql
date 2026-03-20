/*
  # Create email_verifications table

  ## Purpose
  Stores secure one-time email verification tokens for new user registrations.
  Tokens are generated server-side (32+ bytes, hex encoded), expire after 1 hour,
  and are invalidated immediately after successful use.

  ## New Tables
  - `email_verifications`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → profiles, CASCADE)
    - `email` (text) — the address the token was sent to
    - `token` (text, unique) — random 64-char hex token
    - `expires_at` (timestamptz) — 1 hour after creation
    - `used_at` (timestamptz, nullable) — set when consumed; null = still valid
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; no direct client access (service-role only via edge function)
  - Index on token for fast lookups
  - Index on user_id for resend checks
*/

CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
