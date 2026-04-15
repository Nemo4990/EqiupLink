/*
  # Diagnostics Table & Credits System

  1. New Tables
    - `diagnostics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `machine_model` (text)
      - `fault_code` (text, optional)
      - `symptoms` (text, description of problem)
      - `ai_response` (text, markdown formatted response)
      - `created_at` (timestamp)

  2. Schema Changes
    - Add `credits` column to `profiles` table (integer, default 10)

  3. Security
    - Enable RLS on `diagnostics` table
    - Add policy for users to read their own diagnostics
    - Update `profiles` table to allow users to read and update credits
    - Add indexes for efficient queries

  4. Important Notes
    - Each user starts with 10 credits
    - Users can only view and update their own data
    - Diagnostic records are immutable after creation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits integer DEFAULT 10;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_model text NOT NULL,
  fault_code text,
  symptoms text NOT NULL,
  ai_response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_user_id ON diagnostics(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_created_at ON diagnostics(created_at DESC);

ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnostics"
  ON diagnostics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostics"
  ON diagnostics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
