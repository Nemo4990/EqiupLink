/*
  # Rework Monetization System — ETB Currency

  ## Summary
  This migration reworks the monetization system to use ETB (Ethiopian Birr) pricing,
  adds a proper offers/quotes system between customers and technicians, and configures
  admin-controlled fee settings.

  ## Changes

  ### New Tables
  - `platform_settings` — Admin-configurable fees: lead_price, connection_fee, subscription_price, commission_rate
  - `service_requests` — Customer job postings (FREE to post), with title, category, budget
  - `offers` — Technician offers on service requests (price, message)
  - `contact_unlocks` — Track when customers pay to reveal technician contact

  ### Modified Tables
  - `subscription_plans` — Update ETB pricing (800 ETB/month)
  - `wallets` — Already exists, now treated as ETB
  - `commissions` — Already exists

  ### RLS Policies for new tables
  - Full RLS on all new tables
*/

-- Platform settings (admin-controlled fee configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value numeric NOT NULL DEFAULT 0,
  setting_label text NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update platform settings"
  ON platform_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default platform settings
INSERT INTO platform_settings (setting_key, setting_value, setting_label, description) VALUES
  ('lead_price', 15, 'Lead Price (ETB)', 'Amount technicians pay to unlock a job contact'),
  ('connection_fee', 20, 'Connection Fee (ETB)', 'Amount customers pay to access technician contact after accepting offer'),
  ('subscription_price', 800, 'Pro Subscription Price (ETB/month)', 'Monthly price for Pro plan'),
  ('commission_rate', 7.5, 'Commission Rate (%)', 'Platform commission on completed job amounts')
ON CONFLICT (setting_key) DO NOTHING;

-- Service requests table (customers post these for FREE)
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'mechanic', -- mechanic, electrician, hydraulics, etc.
  location text NOT NULL,
  budget numeric,
  image_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  accepted_offer_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

CREATE POLICY "Customers can create service requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Anyone authenticated can view open service requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can update their own requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Offers table (technicians submit offers on service requests)
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  price numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  is_contact_unlocked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_offers_service_request_id ON offers(service_request_id);
CREATE INDEX IF NOT EXISTS idx_offers_technician_id ON offers(technician_id);
CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON offers(customer_id);

CREATE POLICY "Technicians can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician_id);

CREATE POLICY "Offer parties can view offers"
  ON offers FOR SELECT
  TO authenticated
  USING (auth.uid() = technician_id OR auth.uid() = customer_id);

CREATE POLICY "Customers can update offer status"
  ON offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = technician_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = technician_id);

-- Contact unlocks table
CREATE TABLE IF NOT EXISTS contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unlock_type text NOT NULL CHECK (unlock_type IN ('customer_to_technician', 'technician_to_job')),
  unlocker_id uuid NOT NULL REFERENCES profiles(id),
  target_id uuid NOT NULL REFERENCES profiles(id),
  reference_id uuid, -- offer_id or service_request_id
  amount_paid numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'wallet' CHECK (method IN ('wallet', 'subscription', 'free')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_unlocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_unlocks_unlocker_id ON contact_unlocks(unlocker_id);

CREATE POLICY "Users can view their own unlocks"
  ON contact_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = unlocker_id);

CREATE POLICY "Users can create unlocks"
  ON contact_unlocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = unlocker_id);

-- Active jobs table (created when offer is accepted and contact is unlocked)
CREATE TABLE IF NOT EXISTS active_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES service_requests(id),
  offer_id uuid NOT NULL REFERENCES offers(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  technician_id uuid NOT NULL REFERENCES profiles(id),
  agreed_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'in_progress', 'completed', 'disputed')),
  commission_rate numeric NOT NULL DEFAULT 7.5,
  commission_amount numeric,
  technician_net numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE active_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_active_jobs_technician_id ON active_jobs(technician_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_customer_id ON active_jobs(customer_id);

CREATE POLICY "Job parties can view active jobs"
  ON active_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = technician_id);

CREATE POLICY "Job parties can update active jobs"
  ON active_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = technician_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = technician_id);

CREATE POLICY "System can insert active jobs"
  ON active_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = technician_id);

-- Update subscription plans to use ETB pricing
UPDATE subscription_plans SET price_monthly = 800 WHERE tier = 'pro' AND role = 'mechanic';
UPDATE subscription_plans SET price_monthly = 0 WHERE tier = 'free';

-- Update lead_cost_per_job to match ETB pricing
UPDATE subscription_plans SET lead_cost_per_job = 15 WHERE tier = 'free' AND role = 'mechanic';
