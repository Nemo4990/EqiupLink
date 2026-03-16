/*
  # Add provider_id to user_payments

  ## Changes
  - Adds `provider_id` column to `user_payments` table to track which provider
    the payment is for. This enables admin to grant correct contact_history access
    on approval.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_payments' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE user_payments ADD COLUMN provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
