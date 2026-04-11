/*
  # Growth System: Referrals, Analytics, Onboarding

  1. Modified Tables
    - `profiles`
      - `referral_code` (text, unique) - Auto-generated unique referral code per user
      - `referred_by` (uuid, nullable) - References the user who referred this user
      - `onboarding_completed` (boolean) - Whether user completed onboarding
      - `signup_credits_granted` (boolean) - Whether signup bonus was given

  2. New Tables
    - `referrals`
      - Tracks each referral relationship and reward status
      - `referrer_id`, `referred_id`, `referrer_reward`, `referred_reward`, `status`
    - `analytics_events`
      - Lightweight event tracking for growth metrics
      - `user_id`, `event_type`, `event_data`, `created_at`

  3. Security
    - RLS enabled on all new tables
    - Users can only read their own referrals and analytics events
    - Insert policies for authenticated users on analytics_events
    - Referrals insert restricted to the referred user
*/

-- Add referral columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'signup_credits_granted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signup_credits_granted boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Generate referral codes for existing users that don't have one
UPDATE profiles
SET referral_code = UPPER(SUBSTR(MD5(id::text || created_at::text), 1, 8))
WHERE referral_code IS NULL;

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id),
  referred_id uuid NOT NULL REFERENCES profiles(id),
  referrer_reward numeric NOT NULL DEFAULT 5,
  referred_reward numeric NOT NULL DEFAULT 3,
  referrer_rewarded boolean NOT NULL DEFAULT false,
  referred_rewarded boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_pair ON referrals(referrer_id, referred_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referrals as referred"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referred_id);

CREATE POLICY "Authenticated users can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "Users can update own referrals as referrer"
  ON referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-generate referral code on new profile insert
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := UPPER(SUBSTR(MD5(NEW.id::text || clock_timestamp()::text || random()::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();
