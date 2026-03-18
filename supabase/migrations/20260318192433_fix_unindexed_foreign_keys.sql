/*
  # Fix Unindexed Foreign Keys

  ## Summary
  Adds covering indexes for all foreign key columns that were missing indexes.
  This improves JOIN and lookup performance for these tables.

  ## Tables affected
  - active_jobs: offer_id, service_request_id
  - boosted_listings: payment_id
  - commissions: owner_id
  - contact_unlocks: target_id
  - customer_contact_unlocks: payment_id, technician_id
  - forum_posts: author_id
  - forum_replies: author_id, post_id
  - job_unlocks: wallet_transaction_id
  - platform_settings: updated_by
  - subscriptions: payment_id
  - wallet_transactions: payment_id
*/

CREATE INDEX IF NOT EXISTS idx_active_jobs_offer_id ON public.active_jobs (offer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_service_request_id ON public.active_jobs (service_request_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_payment_id ON public.boosted_listings (payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner_id ON public.commissions (owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target_id ON public.contact_unlocks (target_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_payment_id ON public.customer_contact_unlocks (payment_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_technician_id ON public.customer_contact_unlocks (technician_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id ON public.forum_replies (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON public.forum_replies (post_id);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_wallet_transaction_id ON public.job_unlocks (wallet_transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON public.subscriptions (payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_id ON public.wallet_transactions (payment_id);
