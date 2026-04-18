/*
  # Workflow State Machine Upgrade

  1. New Columns
    - `breakdown_requests.quote_expires_at` (timestamptz) - Expiration date for quotations
    - `breakdown_requests.owner_location_shared` (boolean) - Whether site location was shared with mechanic

  2. Changes
    - Add `quote_expires_at` column for quotation expiry tracking
    - Add `owner_location_shared` to track when location is revealed to mechanic after dispatch

  3. Notes
    - The dispatch_status state machine: pending_admin_review -> quote_sent -> paid -> dispatched -> completed
    - Mechanic offer sub-states: not_offered -> pending -> accepted/declined
    - Quote is only sent AFTER mechanic accepts the offer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'breakdown_requests' AND column_name = 'quote_expires_at'
  ) THEN
    ALTER TABLE breakdown_requests ADD COLUMN quote_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'breakdown_requests' AND column_name = 'owner_location_shared'
  ) THEN
    ALTER TABLE breakdown_requests ADD COLUMN owner_location_shared boolean DEFAULT false;
  END IF;
END $$;
