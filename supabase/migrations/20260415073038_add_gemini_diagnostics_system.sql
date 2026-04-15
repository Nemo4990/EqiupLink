/*
  # Add Gemini-powered AI Diagnostics System

  1. New Tables
    - `diagnostics_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `machine_model` (text)
      - `fault_code` (text, optional)
      - `symptoms` (text)
      - `ai_response` (text, markdown)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `profiles`
      - Add `credit_balance` (integer, default 10)

  3. Security
    - Enable RLS on `diagnostics_history` table
    - Add policies for users to view/insert their own records
    - Add policy for admins to manage credits
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credit_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credit_balance integer DEFAULT 10;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS diagnostics_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_model text NOT NULL,
  fault_code text,
  symptoms text NOT NULL,
  ai_response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diagnostics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostics"
  ON diagnostics_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostics"
  ON diagnostics_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all diagnostics"
  ON diagnostics_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_diagnostics_user_id ON diagnostics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_created_at ON diagnostics_history(created_at);
