/*
  # Mechanic Job Offer Tracking

  ## Summary
  Adds mechanic job offer tracking to the breakdown dispatch system, enabling a proper
  offer → accept/decline → quote → dispatch workflow.

  ## Changes

  ### Modified Tables
  - `breakdown_requests`
    - `mechanic_offer_status` (text): tracks offer state ('not_offered', 'pending', 'accepted', 'declined')
    - `mechanic_offer_sent_at` (timestamptz): when the offer was sent to the mechanic

  ## Security
  - Mechanic RLS policy: mechanics can update offer status only for their assigned records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'breakdown_requests' AND column_name = 'mechanic_offer_status'
  ) THEN
    ALTER TABLE breakdown_requests ADD COLUMN mechanic_offer_status text DEFAULT 'not_offered';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'breakdown_requests' AND column_name = 'mechanic_offer_sent_at'
  ) THEN
    ALTER TABLE breakdown_requests ADD COLUMN mechanic_offer_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'breakdown_requests' AND policyname = 'Mechanics can update their own offer status'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Mechanics can update their own offer status"
        ON breakdown_requests
        FOR UPDATE
        TO authenticated
        USING (assigned_mechanic_id = auth.uid())
        WITH CHECK (assigned_mechanic_id = auth.uid())
    $policy$;
  END IF;
END $$;
