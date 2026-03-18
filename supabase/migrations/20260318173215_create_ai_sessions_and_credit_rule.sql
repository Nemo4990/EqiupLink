/*
  # Create AI Sessions table and AI Diagnose credit rule

  1. New Tables
    - `ai_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `machine_type` (text) - type of equipment
      - `brand` (text) - equipment brand
      - `problem` (text) - user's problem description
      - `ai_response` (jsonb) - structured AI response with causes, steps, severity, recommendation
      - `created_at` (timestamptz)

  2. Credit Rule
    - `ai_diagnose` action key: 1 credit cost, 3 free uses

  3. Security
    - Enable RLS on `ai_sessions`
    - Users can only read their own sessions
    - Users can insert their own sessions
    - Index on user_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_type text NOT NULL,
  brand text NOT NULL DEFAULT '',
  problem text NOT NULL,
  ai_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);

ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI sessions"
  ON ai_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI sessions"
  ON ai_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

INSERT INTO credit_rules (action_key, action_label, credits_cost, free_quota, is_active)
VALUES ('ai_diagnose', 'AI Machine Diagnosis', 1, 3, true)
ON CONFLICT (action_key) DO NOTHING;
