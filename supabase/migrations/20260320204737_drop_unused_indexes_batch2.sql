/*
  # Drop Unused Indexes (Batch 2)

  ## Summary
  Removes indexes that have never been used according to Supabase's index usage stats.
  Dropping unused indexes reduces write overhead and storage usage without impacting query performance.

  ## Indexes Dropped
  - idx_active_jobs_offer_id
  - idx_active_jobs_service_request_id
  - idx_boosted_listings_payment_id
  - idx_commissions_owner_id
  - idx_contact_unlocks_target_id
  - idx_customer_contact_unlocks_payment_id
  - idx_customer_contact_unlocks_technician_id
  - idx_forum_posts_author_id
  - idx_forum_replies_author_id
  - idx_forum_replies_post_id
  - idx_job_unlocks_wallet_transaction_id
  - idx_platform_settings_updated_by
  - idx_subscriptions_payment_id
  - idx_wallet_transactions_payment_id
  - idx_email_verifications_token
*/

DROP INDEX IF EXISTS public.idx_active_jobs_offer_id;
DROP INDEX IF EXISTS public.idx_active_jobs_service_request_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_payment_id;
DROP INDEX IF EXISTS public.idx_commissions_owner_id;
DROP INDEX IF EXISTS public.idx_contact_unlocks_target_id;
DROP INDEX IF EXISTS public.idx_customer_contact_unlocks_payment_id;
DROP INDEX IF EXISTS public.idx_customer_contact_unlocks_technician_id;
DROP INDEX IF EXISTS public.idx_forum_posts_author_id;
DROP INDEX IF EXISTS public.idx_forum_replies_author_id;
DROP INDEX IF EXISTS public.idx_forum_replies_post_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_wallet_transaction_id;
DROP INDEX IF EXISTS public.idx_platform_settings_updated_by;
DROP INDEX IF EXISTS public.idx_subscriptions_payment_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_payment_id;
DROP INDEX IF EXISTS public.idx_email_verifications_token;
