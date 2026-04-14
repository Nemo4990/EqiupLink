/*
  # Allow Anonymous Users to View Supplier Profiles

  1. Changes
    - Add policy for anonymous users to view supplier profiles
    - Enables marketplace browsing without authentication

  2. Security
    - Anonymous users can view all profiles (suppliers, mechanics, etc.)
    - No write access for anonymous users
*/

CREATE POLICY "Anonymous users can view profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);
