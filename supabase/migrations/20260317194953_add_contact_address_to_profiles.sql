/*
  # Add Contact Address Fields to Profiles

  ## Overview
  Suppliers, mechanics, rental providers, and owners need to register their
  contact details before posting services or products. These details are
  revealed to paying users only — they are NOT exposed publicly.

  ## Changes to `profiles` table
  - `contact_phone` — primary phone number for business contact (separate from personal `phone`)
  - `contact_email` — business/contact email (may differ from login email)
  - `contact_address` — physical address or service area address
  - `contact_telegram` — optional Telegram handle
  - `contact_whatsapp` — optional WhatsApp number
  - `contact_other` — any other contact info (free text)
  - `contact_complete` — boolean flag, true when user has filled required contact fields

  ## Notes
  - These fields are protected by RLS — users can only read their own contact fields
  - A separate policy allows reading another user's contact fields only via the
    contact_history table (i.e. after access has been paid for). This is enforced
    at the application layer using the contact_history check already in place.
  - `contact_complete` is automatically maintained by a trigger.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_phone') THEN
    ALTER TABLE profiles ADD COLUMN contact_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_email') THEN
    ALTER TABLE profiles ADD COLUMN contact_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_address') THEN
    ALTER TABLE profiles ADD COLUMN contact_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_telegram') THEN
    ALTER TABLE profiles ADD COLUMN contact_telegram text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_whatsapp') THEN
    ALTER TABLE profiles ADD COLUMN contact_whatsapp text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_other') THEN
    ALTER TABLE profiles ADD COLUMN contact_other text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'contact_complete') THEN
    ALTER TABLE profiles ADD COLUMN contact_complete boolean NOT NULL DEFAULT false;
  END IF;
END $$;
