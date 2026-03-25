/*
  # Supplier Analytics & Merchant Badge System

  ## Overview
  Adds analytics infrastructure for supplier dashboards, including:
  - Part inquiry/view tracking table
  - Part search keyword tracking table
  - Merchant badge assignment on profiles

  ## New Tables
  - `part_views` — tracks when a parts listing is viewed (for "most searched" analytics)
  - `part_inquiries` — tracks when a user clicks to inquire/contact about a part (for "most sold" proxy)

  ## Modified Tables
  - `profiles` — adds `merchant_badge` column (bronze/silver/gold/platinum)

  ## Security
  - RLS enabled on all new tables
  - Suppliers can only read analytics for their own listings
  - Any authenticated user can insert view/inquiry events

  ## Notes
  1. `part_views` and `part_inquiries` are lightweight event tables
  2. Merchant badge is computed by admin or a DB function based on listing count + inquiry volume
  3. The badge hierarchy: bronze (1+ listings), silver (5+ listings or 20+ inquiries), gold (15+ listings or 100+ inquiries), platinum (30+ listings or 300+ inquiries)
*/

-- Track part listing views (search impressions)
CREATE TABLE IF NOT EXISTS part_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES parts_listings(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

ALTER TABLE part_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view stats for own listings"
  ON part_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parts_listings pl
      WHERE pl.id = part_views.listing_id AND pl.supplier_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert view events"
  ON part_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

CREATE INDEX IF NOT EXISTS idx_part_views_listing_id ON part_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_part_views_viewed_at ON part_views(viewed_at);

-- Track part inquiries (contact/unlock events — proxy for "sold/interested")
CREATE TABLE IF NOT EXISTS part_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES parts_listings(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  inquiry_type text NOT NULL DEFAULT 'contact',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE part_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view inquiries for own listings"
  ON part_inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parts_listings pl
      WHERE pl.id = part_inquiries.listing_id AND pl.supplier_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert inquiry events"
  ON part_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX IF NOT EXISTS idx_part_inquiries_listing_id ON part_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_part_inquiries_created_at ON part_inquiries(created_at);

-- Add merchant_badge column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'merchant_badge'
  ) THEN
    ALTER TABLE profiles ADD COLUMN merchant_badge text DEFAULT NULL;
  END IF;
END $$;

-- Add total_sales_volume column to profiles for badge calculation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_sales_volume'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_sales_volume integer DEFAULT 0;
  END IF;
END $$;

-- Function to auto-compute and assign merchant badge based on listing count and inquiry volume
CREATE OR REPLACE FUNCTION compute_merchant_badge(p_supplier_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_count integer;
  inquiry_count integer;
  badge text;
BEGIN
  SELECT COUNT(*) INTO listing_count
  FROM parts_listings
  WHERE supplier_id = p_supplier_id AND is_active = true;

  SELECT COUNT(*) INTO inquiry_count
  FROM part_inquiries pi
  JOIN parts_listings pl ON pl.id = pi.listing_id
  WHERE pl.supplier_id = p_supplier_id;

  IF listing_count >= 30 OR inquiry_count >= 300 THEN
    badge := 'platinum';
  ELSIF listing_count >= 15 OR inquiry_count >= 100 THEN
    badge := 'gold';
  ELSIF listing_count >= 5 OR inquiry_count >= 20 THEN
    badge := 'silver';
  ELSIF listing_count >= 1 THEN
    badge := 'bronze';
  ELSE
    badge := NULL;
  END IF;

  UPDATE profiles SET merchant_badge = badge WHERE id = p_supplier_id;
  RETURN badge;
END;
$$;
