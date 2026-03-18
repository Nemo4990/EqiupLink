/*
  # Access Grants & Credit System

  ## Summary
  Implements the wallet-based credit monetization system for EquipLink.
  Every action that costs credits is gated through access_grants (prevents double charges).

  ## New Tables

  ### access_grants
  - Tracks every resource a user has paid to access
  - `user_id` — who paid
  - `resource_id` — the resource (mechanic profile id, part id, rental id, etc.)
  - `resource_type` — "mechanic" | "part" | "rental" | "job"
  - Unique constraint on (user_id, resource_id, resource_type) prevents double charges

  ### credit_rules
  - Admin-configurable credit costs per action
  - Seeded with defaults: view_contact=1, post_job=2, accept_job=1, list_part=2
  - `free_quota` — how many free actions before credits apply (e.g. 3 free job posts)

  ## Modified Tables

  ### wallets
  - Adds `credits` integer column (1 ETB = 1 credit conceptually; balance is ETB, credits are logical units)
  - Note: we re-use existing `balance` (in ETB) as the credit balance — no separate column needed

  ## Security
  - Full RLS on access_grants
  - Users can only read/insert their own access grants
  - credit_rules readable by all authenticated users, writable by admins only
*/

-- Access grants table (prevents double-charging for same resource)
CREATE TABLE IF NOT EXISTS access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('mechanic', 'part', 'rental', 'job')),
  credits_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_access_grants_user_resource
  ON access_grants(user_id, resource_id, resource_type);

CREATE INDEX IF NOT EXISTS idx_access_grants_user_id ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_resource ON access_grants(resource_id, resource_type);

CREATE POLICY "Users can view own access grants"
  ON access_grants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access grants"
  ON access_grants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Credit rules table (configurable credit costs per action)
CREATE TABLE IF NOT EXISTS credit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key text UNIQUE NOT NULL,
  action_label text NOT NULL,
  credits_cost numeric NOT NULL DEFAULT 1,
  free_quota integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credit_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read credit rules"
  ON credit_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify credit rules"
  ON credit_rules FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can insert credit rules"
  ON credit_rules FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default credit rules
INSERT INTO credit_rules (action_key, action_label, credits_cost, free_quota, description) VALUES
  ('view_mechanic_contact', 'View Mechanic Contact', 1, 0, 'Owner pays 1 credit to view a mechanic phone/WhatsApp'),
  ('view_part_contact', 'View Part Supplier Contact', 1, 0, 'Owner pays 1 credit to view part supplier contact'),
  ('view_rental_contact', 'View Rental Provider Contact', 1, 0, 'Owner pays 1 credit to view rental provider contact'),
  ('post_job', 'Post Job / Breakdown Request', 2, 3, 'Owner gets 3 free job posts, then 2 credits each'),
  ('accept_job_mechanic', 'Mechanic Accept / Unlock Job', 1, 0, 'Mechanic pays 1 credit to unlock job contact (same as lead_price in ETB)'),
  ('list_part', 'Supplier List Part', 2, 3, 'Supplier gets 3 free listings, then 2 credits each'),
  ('list_rental', 'Rental Provider List Equipment', 2, 3, 'Rental provider gets 3 free listings, then 2 credits each')
ON CONFLICT (action_key) DO NOTHING;

-- Ensure every existing user has a wallet row (idempotent)
INSERT INTO wallets (user_id, balance, total_purchased, total_spent)
SELECT p.id, 0, 0, 0
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM wallets w WHERE w.user_id = p.id
)
ON CONFLICT DO NOTHING;
