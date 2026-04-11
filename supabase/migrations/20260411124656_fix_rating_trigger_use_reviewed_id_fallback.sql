/*
  # Fix rating trigger to use reviewed_id as fallback

  ## Problem
  The recalculate_mechanic_rating trigger only reads NEW.mechanic_id.
  Since mechanic_id is NOT NULL, it's always set — this is fine.
  But to be safe and support future inserts that only set reviewed_id,
  we update the trigger to use COALESCE(mechanic_id, reviewed_id).

  Also: update the trigger to fire on UPDATE too, so edits to reviews
  are reflected on mechanic profiles.
*/

CREATE OR REPLACE FUNCTION recalculate_mechanic_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_mechanic_id uuid;
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  target_mechanic_id := COALESCE(NEW.mechanic_id, NEW.reviewed_id);
  IF target_mechanic_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT AVG(rating)::NUMERIC(3,2)
  INTO avg_rating
  FROM (
    SELECT rating
    FROM reviews
    WHERE mechanic_id = target_mechanic_id
       OR reviewed_id = target_mechanic_id
    ORDER BY created_at DESC
    LIMIT 10
  ) AS recent_reviews;

  SELECT COUNT(*)
  INTO review_count
  FROM reviews
  WHERE mechanic_id = target_mechanic_id
     OR reviewed_id = target_mechanic_id;

  UPDATE mechanic_profiles
  SET
    rating = COALESCE(avg_rating, 0),
    total_reviews = review_count
  WHERE user_id = target_mechanic_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalculate_mechanic_rating ON reviews;

CREATE TRIGGER trigger_recalculate_mechanic_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_mechanic_rating();
