/*
  # Add indexes for unindexed foreign keys

  Resolves 26 unindexed foreign key warnings to improve query performance.
  
  1. Indexes Added
    - `idx_active_jobs_offer_id` on `active_jobs(offer_id)`
    - `idx_active_jobs_service_request_id` on `active_jobs(service_request_id)`
    - `idx_boosted_listings_payment_id` on `boosted_listings(payment_id)`
    - `idx_commissions_owner_id` on `commissions(owner_id)`
    - `idx_contact_unlocks_target_id` on `contact_unlocks(target_id)`
    - `idx_customer_contact_unlocks_payment_id` on `customer_contact_unlocks(payment_id)`
    - `idx_customer_contact_unlocks_technician_id` on `customer_contact_unlocks(technician_id)`
    - `idx_demo_listing_photos_uploaded_by` on `demo_listing_photos(uploaded_by)`
    - `idx_diagnostics_history_user_id` on `diagnostics_history(user_id)`
    - `idx_forum_posts_author_id` on `forum_posts(author_id)`
    - `idx_forum_replies_author_id` on `forum_replies(author_id)`
    - `idx_forum_replies_post_id` on `forum_replies(post_id)`
    - `idx_job_matches_admin_id` on `job_matches(admin_id)`
    - `idx_job_postings_admin_id` on `job_postings(admin_id)`
    - `idx_job_ratings_owner_id` on `job_ratings(owner_id)`
    - `idx_job_status_updates_updated_by` on `job_status_updates(updated_by)`
    - `idx_job_unlocks_wallet_transaction_id` on `job_unlocks(wallet_transaction_id)`
    - `idx_mechanic_profiles_verified_by` on `mechanic_profiles(verified_by)`
    - `idx_part_inquiries_buyer_id` on `part_inquiries(buyer_id)`
    - `idx_part_views_viewer_id` on `part_views(viewer_id)`
    - `idx_platform_config_updated_by` on `platform_config(updated_by)`
    - `idx_platform_settings_updated_by` on `platform_settings(updated_by)`
    - `idx_subscriptions_payment_id` on `subscriptions(payment_id)`
    - `idx_supplier_documents_reviewed_by` on `supplier_documents(reviewed_by)`
    - `idx_wallet_transactions_payment_id` on `wallet_transactions(payment_id)`

  2. Performance Impact
    - Prevents sequential scans on foreign key lookups
    - Improves JOIN performance when filtering by these columns
    - Essential for data integrity checks
*/

CREATE INDEX IF NOT EXISTS idx_active_jobs_offer_id ON active_jobs(offer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_service_request_id ON active_jobs(service_request_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_payment_id ON boosted_listings(payment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner_id ON commissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_target_id ON contact_unlocks(target_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_payment_id ON customer_contact_unlocks(payment_id);
CREATE INDEX IF NOT EXISTS idx_customer_contact_unlocks_technician_id ON customer_contact_unlocks(technician_id);
CREATE INDEX IF NOT EXISTS idx_demo_listing_photos_uploaded_by ON demo_listing_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_diagnostics_history_user_id ON diagnostics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_admin_id ON job_matches(admin_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_admin_id ON job_postings(admin_id);
CREATE INDEX IF NOT EXISTS idx_job_ratings_owner_id ON job_ratings(owner_id);
CREATE INDEX IF NOT EXISTS idx_job_status_updates_updated_by ON job_status_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_job_unlocks_wallet_transaction_id ON job_unlocks(wallet_transaction_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_profiles_verified_by ON mechanic_profiles(verified_by);
CREATE INDEX IF NOT EXISTS idx_part_inquiries_buyer_id ON part_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_part_views_viewer_id ON part_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_platform_config_updated_by ON platform_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON platform_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_reviewed_by ON supplier_documents(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_id ON wallet_transactions(payment_id);
