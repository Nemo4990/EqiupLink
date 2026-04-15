/*
  # Drop unused indexes

  Removes 54 unused indexes that consume storage and slow down write operations
  without providing query performance benefits.

  1. Indexes Dropped
    - Various unused indexes on diagnostics, email_delivery_logs, email_broadcasts,
      email_logs, password_reset_tokens, mechanic_verification_profiles, job_postings,
      job_matches, job_acceptances, job_status_updates, job_ratings, engagement_events,
      equipment_rentals, forum_replies, job_unlocks, machines, offers, active_jobs,
      analytics_events, boosted_listings, breakdown_requests, commissions, contact_history,
      contact_unlocks, profiles, quotes, rental_provider_profiles, reviews, service_history,
      subscriptions, supplier_documents, supplier_profiles, user_payments, wallet_transactions

  2. Storage and Performance Impact
    - Reduces index maintenance overhead on INSERT/UPDATE/DELETE operations
    - Frees up storage space
    - Does not affect query performance as these indexes were never used
*/

DROP INDEX IF EXISTS idx_diagnostics_created_at;
DROP INDEX IF EXISTS idx_email_delivery_logs_user_id;
DROP INDEX IF EXISTS idx_email_delivery_logs_status;
DROP INDEX IF EXISTS idx_email_delivery_logs_created_at;
DROP INDEX IF EXISTS idx_email_broadcasts_admin_id;
DROP INDEX IF EXISTS idx_email_broadcasts_status;
DROP INDEX IF EXISTS idx_email_logs_broadcast_id;
DROP INDEX IF EXISTS idx_email_logs_user_id;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
DROP INDEX IF EXISTS idx_password_reset_tokens_token;
DROP INDEX IF EXISTS idx_mechanic_verification_user_id;
DROP INDEX IF EXISTS idx_mechanic_verification_verified;
DROP INDEX IF EXISTS idx_job_postings_owner_id;
DROP INDEX IF EXISTS idx_job_postings_status;
DROP INDEX IF EXISTS idx_job_postings_mechanic_id;
DROP INDEX IF EXISTS idx_job_postings_location;
DROP INDEX IF EXISTS idx_job_matches_job_id;
DROP INDEX IF EXISTS idx_job_matches_mechanic_id;
DROP INDEX IF EXISTS idx_job_matches_status;
DROP INDEX IF EXISTS idx_job_acceptances_job_id;
DROP INDEX IF EXISTS idx_job_acceptances_mechanic_id;
DROP INDEX IF EXISTS idx_job_status_updates_job_id;
DROP INDEX IF EXISTS idx_job_ratings_mechanic_id;
DROP INDEX IF EXISTS idx_job_ratings_job_id;
DROP INDEX IF EXISTS idx_engagement_events_user_id;
DROP INDEX IF EXISTS idx_equipment_rentals_provider_id;
DROP INDEX IF EXISTS idx_forum_replies_parent_reply_id;
DROP INDEX IF EXISTS idx_job_unlocks_breakdown_request_id;
DROP INDEX IF EXISTS idx_machines_owner_id;
DROP INDEX IF EXISTS idx_offers_customer_id;
DROP INDEX IF EXISTS idx_offers_technician_id;
DROP INDEX IF EXISTS idx_active_jobs_customer_id;
DROP INDEX IF EXISTS idx_active_jobs_technician_id;
DROP INDEX IF EXISTS idx_analytics_events_user_id;
DROP INDEX IF EXISTS idx_boosted_listings_listing_id;
DROP INDEX IF EXISTS idx_boosted_listings_supplier_id;
DROP INDEX IF EXISTS idx_breakdown_requests_assigned_mechanic_id;
DROP INDEX IF EXISTS idx_breakdown_requests_machine_id;
DROP INDEX IF EXISTS idx_commissions_technician_id;
DROP INDEX IF EXISTS idx_contact_history_payment_id;
DROP INDEX IF EXISTS idx_contact_history_provider_id;
DROP INDEX IF EXISTS idx_contact_unlocks_unlocker_id;
DROP INDEX IF EXISTS idx_profiles_referred_by;
DROP INDEX IF EXISTS idx_quotes_owner_id;
DROP INDEX IF EXISTS idx_quotes_technician_id;
DROP INDEX IF EXISTS idx_rental_provider_profiles_user_id;
DROP INDEX IF EXISTS idx_reviews_breakdown_request_id;
DROP INDEX IF EXISTS idx_reviews_mechanic_id;
DROP INDEX IF EXISTS idx_reviews_reviewed_id;
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_service_history_breakdown_request_id;
DROP INDEX IF EXISTS idx_service_history_machine_id;
DROP INDEX IF EXISTS idx_service_history_mechanic_id;
DROP INDEX IF EXISTS idx_service_history_owner_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_supplier_documents_user_id;
DROP INDEX IF EXISTS idx_supplier_profiles_user_id;
DROP INDEX IF EXISTS idx_user_payments_reviewed_by;
DROP INDEX IF EXISTS idx_user_payments_user_id;
DROP INDEX IF EXISTS idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS idx_wallet_transactions_wallet_id;
