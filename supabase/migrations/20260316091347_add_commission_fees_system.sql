/*
  # Commission Fee Payment System

  ## Overview
  Adds payment management for platform commission fees. Users must pay fees before contacting service providers.
  Admin approves profiles and manages payments.

  ## New Tables
  1. `commission_fees` - Stores fee configurations per service type
     - `id` (uuid, primary key)
     - `service_type` (text) - mechanic_contact, parts_inquiry, rental_inquiry
     - `fee_amount` (numeric) - Amount in USD
     - `description` (text)
     - `is_active` (boolean)
  
  2. `user_payments` - Tracks user fee payments
     - `id` (uuid, primary key)
     - `user_id` (uuid) - The user who paid
     - `fee_type` (text) - Type of fee paid
     - `amount` (numeric) - Amount paid
     - `status` (text) - pending, approved, rejected
     - `transaction_id` (text) - External payment reference
     - `admin_notes` (text) - Notes from admin
  
  3. `contact_credits` - Tracks user's available contact credits
     - `id` (uuid, primary key)
     - `user_id` (uuid)
     - `credit_type` (text) - mechanic, supplier, rental
     - `credits_remaining` (integer)
     - `expires_at` (timestamptz)

  ## Changes to existing tables
  - Add `payment_verified` column to profiles table

  ## Security
  - RLS enabled on all new tables
  - Users can only see their own payments and credits
  - Admin can manage all payments
*/

-- Commission fee configurations
CREATE TABLE IF NOT EXISTS commission_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL UNIQUE CHECK (service_type IN ('mechanic_contact', 'parts_inquiry', 'rental_inquiry', 'breakdown_post')),
  fee_amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commission_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fees"
  ON commission_fees FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage fees"
  ON commission_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Insert default fee configurations
INSERT INTO commission_fees (service_type, fee_amount, description) VALUES
  ('mechanic_contact', 25.00, 'Fee to contact a mechanic and view their full details'),
  ('parts_inquiry', 15.00, 'Fee to inquire about spare parts from suppliers'),
  ('rental_inquiry', 20.00, 'Fee to inquire about equipment rentals'),
  ('breakdown_post', 10.00, 'Fee to post a breakdown request')
ON CONFLICT (service_type) DO NOTHING;

-- User payments table
CREATE TABLE IF NOT EXISTS user_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  transaction_id text,
  payment_method text,
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON user_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON user_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON user_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payments"
  ON user_payments FOR UPDATE
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

-- Contact credits table
CREATE TABLE IF NOT EXISTS contact_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credit_type text NOT NULL CHECK (credit_type IN ('mechanic', 'supplier', 'rental', 'breakdown')),
  credits_remaining integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, credit_type)
);

ALTER TABLE contact_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON contact_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON contact_credits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert credits"
  ON contact_credits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all credits"
  ON contact_credits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add payment_verified to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'payment_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN payment_verified boolean DEFAULT false;
  END IF;
END $$;

-- Contact history to track which providers a user has paid to contact
CREATE TABLE IF NOT EXISTS contact_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('mechanic', 'supplier', 'rental')),
  payment_id uuid REFERENCES user_payments(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider_id, contact_type)
);

ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact history"
  ON contact_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contact history"
  ON contact_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_payments_user ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
CREATE INDEX IF NOT EXISTS idx_contact_credits_user ON contact_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_user ON contact_history(user_id);
