/*
  # Add Payment Methods Table

  ## Overview
  Allows admin to configure payment methods (bank transfer, mobile money, etc.)
  that users see when submitting commission fee payments.

  ## New Tables
  1. `payment_methods` - Admin-managed payment options shown to users
     - `id` (uuid, primary key)
     - `method_name` (text) - Display name (e.g. "Bank Transfer", "M-Pesa")
     - `provider` (text) - Provider/institution name
     - `account_name` (text) - Account holder name
     - `account_number` (text) - Account number or phone
     - `instructions` (text) - Step-by-step payment instructions
     - `is_active` (boolean) - Whether users can see this option
     - `sort_order` (integer) - Display order

  ## Security
  - RLS enabled
  - All authenticated users can view active methods
  - Only admins can manage methods
*/

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  instructions text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment methods"
  ON payment_methods FOR UPDATE
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

CREATE POLICY "Admins can delete payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
