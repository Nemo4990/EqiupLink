/*
  # Fix review submission and rating calculation

  1. Changes
    - Create a trigger function to automatically update mechanic ratings when reviews are inserted
    - This runs with SECURITY DEFINER to bypass RLS restrictions
    - Calculates average from last 10 reviews and updates mechanic_profiles

  2. Security
    - Function runs as definer (postgres) to update mechanic_profiles
    - Only triggered by valid review inserts that pass RLS
*/

-- Create function to recalculate mechanic rating
CREATE OR REPLACE FUNCTION recalculate_mechanic_rating()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Get average of last 10 reviews
  SELECT AVG(rating)::NUMERIC(3,2), COUNT(*)
  INTO avg_rating, review_count
  FROM (
    SELECT rating
    FROM reviews
    WHERE mechanic_id = NEW.mechanic_id
    ORDER BY created_at DESC
    LIMIT 10
  ) AS recent_reviews;

  -- Get total count
  SELECT COUNT(*)
  INTO review_count
  FROM reviews
  WHERE mechanic_id = NEW.mechanic_id;

  -- Update mechanic profile
  UPDATE mechanic_profiles
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = review_count
  WHERE user_id = NEW.mechanic_id;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-update rating after review insert
DROP TRIGGER IF EXISTS trigger_recalculate_mechanic_rating ON reviews;

CREATE TRIGGER trigger_recalculate_mechanic_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_mechanic_rating();
