/*
  # Fix Unindexed Foreign Keys (Batch 3)

  Adds covering indexes for all foreign keys that lack them, improving JOIN and
  lookup performance across the following tables:
  - active_jobs (offer_id, service_request_id)
  - boosted_listings (payment_id)
  - commissions (owner_id)
  - contact_unlocks (target_id)
  - customer_contact_unlocks (payment_id, technician_id)
  - forum_posts (author_id)
  - forum_replies (author_id, post_id)
  - job_unlocks (wallet_transaction_id)
  - mechanic_profiles (verified_by)
  - part_inquiries (buyer_id)
  - part_views (viewer_id)
  - platform_config (updated_by)
  - platform_settings (updated_by)
  - subscriptions (payment_id)
  - supplier_documents (reviewed_by)
  - wallet_transactions (payment_id)
*/

CREATE INDEX IF NOT EXISTS idx_active_jobs_offer_id ON public.active_jobs(offer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_service_request_id ON public.active_jobs(service_request_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_payment_id ON public.boosted_listings(payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner_id ON public.commissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target_id ON public.contact_unlocks(target_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_payment_id ON public.customer_contact_unlocks(payment_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_technician_id ON public.customer_contact_unlocks(technician_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id ON public.forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON public.forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_wallet_transaction_id ON public.job_unlocks(wallet_transaction_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mechanic_profiles' AND column_name = 'verified_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_verified_by ON public.mechanic_profiles(verified_by)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_part_inquiries_buyer_id ON public.part_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_part_views_viewer_id ON public.part_views(viewer_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_config' AND column_name = 'updated_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by ON public.platform_config(updated_by)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'updated_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings(updated_by)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON public.subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_reviewed_by ON public.supplier_documents(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_id ON public.wallet_transactions(payment_id);
