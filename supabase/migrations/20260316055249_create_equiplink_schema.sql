/*
  # EquipLink Database Schema

  ## Overview
  Full schema for the EquipLink heavy equipment service marketplace platform.

  ## Tables Created
  1. `profiles` - Extended user profiles linked to auth.users
  2. `mechanic_profiles` - Technician specialization and service details
  3. `supplier_profiles` - Spare parts supplier details
  4. `rental_provider_profiles` - Equipment rental provider details
  5. `machines` - Equipment owned by users
  6. `breakdown_requests` - Emergency breakdown postings
  7. `parts_listings` - Spare parts for sale
  8. `equipment_rentals` - Machines available for rent
  9. `reviews` - Ratings and reviews for mechanics
  10. `messages` - Internal messaging between users
  11. `notifications` - System notifications
  12. `service_history` - Machine maintenance records

  ## Security
  - RLS enabled on all tables
  - Role-based access policies
  - Users can only modify their own data
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'mechanic', 'supplier', 'rental_provider', 'admin')),
  avatar_url text,
  phone text,
  location text,
  bio text,
  is_approved boolean DEFAULT false,
  is_suspended boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Mechanic profiles
CREATE TABLE IF NOT EXISTS mechanic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  specializations text[] DEFAULT '{}',
  years_experience integer DEFAULT 0,
  service_area text,
  supported_brands text[] DEFAULT '{}',
  hourly_rate numeric(10,2),
  is_available boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mechanic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mechanic profiles"
  ON mechanic_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mechanics can insert own profile"
  ON mechanic_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mechanics can update own profile"
  ON mechanic_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supplier profiles
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text,
  supported_brands text[] DEFAULT '{}',
  location text,
  description text,
  rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view supplier profiles"
  ON supplier_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Suppliers can insert own profile"
  ON supplier_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppliers can update own profile"
  ON supplier_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rental provider profiles
CREATE TABLE IF NOT EXISTS rental_provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text,
  location text,
  description text,
  rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rental_provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rental provider profiles"
  ON rental_provider_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Providers can insert own profile"
  ON rental_provider_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers can update own profile"
  ON rental_provider_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Machines owned by users
CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_type text NOT NULL DEFAULT '',
  machine_model text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  year integer,
  serial_number text,
  image_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own machines"
  ON machines FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert machines"
  ON machines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own machines"
  ON machines FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own machines"
  ON machines FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Breakdown requests
CREATE TABLE IF NOT EXISTS breakdown_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES machines(id) ON DELETE SET NULL,
  machine_type text NOT NULL DEFAULT '',
  machine_model text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  image_url text,
  assigned_mechanic_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE breakdown_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own requests"
  ON breakdown_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_mechanic_id);

CREATE POLICY "Mechanics can view open requests"
  ON breakdown_requests FOR SELECT
  TO authenticated
  USING (status = 'open');

CREATE POLICY "Owners can insert requests"
  ON breakdown_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own requests"
  ON breakdown_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = assigned_mechanic_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = assigned_mechanic_id);

-- Parts listings
CREATE TABLE IF NOT EXISTS parts_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  part_name text NOT NULL DEFAULT '',
  part_number text,
  description text,
  machine_compatibility text[] DEFAULT '{}',
  category text DEFAULT 'other',
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer DEFAULT 1,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE parts_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active parts listings"
  ON parts_listings FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Suppliers can view own listings"
  ON parts_listings FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can insert listings"
  ON parts_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can update own listings"
  ON parts_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = supplier_id)
  WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can delete own listings"
  ON parts_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = supplier_id);

-- Equipment rentals
CREATE TABLE IF NOT EXISTS equipment_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  machine_model text NOT NULL DEFAULT '',
  machine_type text NOT NULL DEFAULT '',
  brand text,
  year integer,
  hourly_rate numeric(10,2),
  daily_rate numeric(10,2),
  location text NOT NULL DEFAULT '',
  description text,
  image_url text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available rentals"
  ON equipment_rentals FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "Providers can view own rentals"
  ON equipment_rentals FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert rentals"
  ON equipment_rentals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own rentals"
  ON equipment_rentals FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own rentals"
  ON equipment_rentals FOR DELETE
  TO authenticated
  USING (auth.uid() = provider_id);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  breakdown_request_id uuid REFERENCES breakdown_requests(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'job_request', 'message', 'review')),
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service history
CREATE TABLE IF NOT EXISTS service_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mechanic_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  parts_replaced text[] DEFAULT '{}',
  cost numeric(10,2),
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  next_service_date date,
  breakdown_request_id uuid REFERENCES breakdown_requests(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own service history"
  ON service_history FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Mechanics can view service history they worked on"
  ON service_history FOR SELECT
  TO authenticated
  USING (auth.uid() = mechanic_id);

CREATE POLICY "Owners can insert service history"
  ON service_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own service history"
  ON service_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_status ON breakdown_requests(status);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_owner ON breakdown_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_parts_listings_supplier ON parts_listings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_provider ON equipment_rentals(provider_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_service_history_machine ON service_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_user ON mechanic_profiles(user_id);
