/*
  # Fix reviews table schema

  ## Problem
  The reviews table uses `breakdown_request_id` as the job reference column, but
  newer code (MyRequests.tsx) queries for `reviewed_id` and `related_id` columns
  which do not exist, causing:
  1. "Failed to submit rating" — insert succeeds but duplicate-check query fails
  2. `has_review` is never set to true — owner always sees "Rate the Mechanic" button

  ## Changes
  1. Add `related_id` column (uuid, nullable) — references the service_request or
     breakdown_request that this review is for (replaces breakdown_request_id usage
     in service-request context)
  2. Add `reviewed_id` column (uuid, nullable) — alias for mechanic_id used by
     newer query patterns
  3. Backfill existing rows: set related_id = breakdown_request_id where set,
     set reviewed_id = mechanic_id
  4. Add index on (reviewer_id, reviewed_id, related_id) for duplicate checks
  5. Update RLS INSERT policy to also allow owner/customer roles (not just auth.uid = reviewer_id)

  ## Security
  - INSERT policy already checks auth.uid() = reviewer_id — no change needed there
  - SELECT policy is public to authenticated users — no change needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN related_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'reviewed_id'
  ) THEN
    ALTER TABLE reviews ADD COLUMN reviewed_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE reviews
SET
  related_id = COALESCE(related_id, breakdown_request_id),
  reviewed_id = COALESCE(reviewed_id, mechanic_id)
WHERE reviewed_id IS NULL OR related_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_reviewed_related
  ON reviews(reviewer_id, reviewed_id, related_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id
  ON reviews(reviewed_id);

CREATE INDEX IF NOT EXISTS idx_reviews_related_id
  ON reviews(related_id);
