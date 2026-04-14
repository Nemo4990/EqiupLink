/*
  # Allow Anonymous Users to View Listings and Mechanics

  1. Changes
    - Add policy for anonymous users to view active parts listings
    - Add policy for anonymous users to view mechanic profiles
    - Allows browsing the marketplace without authentication
    - Contact features remain restricted to authenticated users

  2. Security
    - Anonymous users can only view active (is_active = true) parts
    - Anonymous users can view all mechanic profiles
    - No write access for anonymous users
*/

CREATE POLICY "Anonymous users can view active parts listings"
  ON parts_listings
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Anonymous users can view mechanic profiles"
  ON mechanic_profiles
  FOR SELECT
  TO anon
  USING (true);
