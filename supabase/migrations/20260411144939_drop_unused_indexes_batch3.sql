/*
  # Drop Unused Indexes (Batch 3)

  Removes indexes that have never been used by the query planner, reducing
  write overhead and storage without any impact on query performance.
*/

DROP INDEX IF EXISTS public.idx_device_tokens_user_id;
DROP INDEX IF EXISTS public.idx_device_tokens_platform;
DROP INDEX IF EXISTS public.idx_leaderboard_week_start;
DROP INDEX IF EXISTS public.idx_engagement_events_user_id;
DROP INDEX IF EXISTS public.idx_engagement_events_type;
DROP INDEX IF EXISTS public.idx_analytics_events_user_id;
DROP INDEX IF EXISTS public.idx_analytics_events_type;
DROP INDEX IF EXISTS public.idx_analytics_events_created_at;
DROP INDEX IF EXISTS public.idx_reviews_related_id;
DROP INDEX IF EXISTS public.idx_reviews_reviewer_reviewed_related;
DROP INDEX IF EXISTS public.idx_reviews_reviewed_id;
DROP INDEX IF EXISTS public.idx_profiles_is_verified;
DROP INDEX IF EXISTS public.idx_referrals_referrer_id;
DROP INDEX IF EXISTS public.idx_mechanic_profiles_is_verified;
DROP INDEX IF EXISTS public.idx_contact_history_provider_id;
DROP INDEX IF EXISTS public.idx_active_jobs_customer_id;
DROP INDEX IF EXISTS public.idx_active_jobs_technician_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_listing_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_supplier_id;
DROP INDEX IF EXISTS public.idx_breakdown_requests_assigned_mechanic_id;
DROP INDEX IF EXISTS public.idx_breakdown_requests_machine_id;
DROP INDEX IF EXISTS public.idx_commissions_technician_id;
DROP INDEX IF EXISTS public.idx_contact_history_payment_id;
DROP INDEX IF EXISTS public.idx_contact_unlocks_unlocker_id;
DROP INDEX IF EXISTS public.idx_equipment_rentals_provider_id;
DROP INDEX IF EXISTS public.idx_forum_replies_parent_reply_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_machines_owner_id;
DROP INDEX IF EXISTS public.idx_offers_customer_id;
DROP INDEX IF EXISTS public.idx_offers_technician_id;
DROP INDEX IF EXISTS public.idx_quotes_technician_id;
DROP INDEX IF EXISTS public.idx_rental_provider_profiles_user_id;
DROP INDEX IF EXISTS public.idx_quotes_owner_id;
DROP INDEX IF EXISTS public.idx_reviews_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_reviews_mechanic_id;
DROP INDEX IF EXISTS public.idx_reviews_reviewer_id;
DROP INDEX IF EXISTS public.idx_service_history_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_service_history_machine_id;
DROP INDEX IF EXISTS public.idx_service_history_mechanic_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_wallet_id;
DROP INDEX IF EXISTS public.idx_profiles_referral_code;
DROP INDEX IF EXISTS public.idx_part_views_viewed_at;
DROP INDEX IF EXISTS public.idx_service_history_owner_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_supplier_profiles_user_id;
DROP INDEX IF EXISTS public.idx_user_payments_reviewed_by;
DROP INDEX IF EXISTS public.idx_user_payments_user_id;
DROP INDEX IF EXISTS public.idx_profiles_referred_by;
DROP INDEX IF EXISTS public.idx_part_inquiries_created_at;
DROP INDEX IF EXISTS public.idx_supplier_documents_user_id;
DROP INDEX IF EXISTS public.idx_supplier_documents_status;
DROP INDEX IF EXISTS public.idx_platform_config_key;
