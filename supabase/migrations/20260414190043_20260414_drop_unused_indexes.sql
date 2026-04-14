/*
  # Drop Unused Indexes

  1. Performance Optimization
    - Remove 22 unused indexes that consume storage and slow down writes
    - Improve overall database performance

  2. Dropped Indexes
    - active_jobs: offer_id, service_request_id
    - boosted_listings: payment_id
    - commissions: owner_id
    - contact_unlocks: target_id
    - customer_contact_unlocks: payment_id, technician_id
    - forum_posts: author_id
    - forum_replies: author_id, post_id
    - job_unlocks: wallet_transaction_id
    - mechanic_profiles: verified_by
    - part_inquiries: buyer_id
    - part_views: viewer_id
    - platform_config: updated_by
    - platform_settings: updated_by
    - subscriptions: payment_id
    - supplier_documents: reviewed_by
    - wallet_transactions: payment_id
    - demo_listing_photos: listing, uploaded_by
    - user_promo_notifications: created_at
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
DROP INDEX IF EXISTS public.idx_mechanic_profiles_verified_by;
DROP INDEX IF EXISTS public.idx_part_inquiries_buyer_id;
DROP INDEX IF EXISTS public.idx_part_views_viewer_id;
DROP INDEX IF EXISTS public.idx_platform_config_updated_by;
DROP INDEX IF EXISTS public.idx_platform_settings_updated_by;
DROP INDEX IF EXISTS public.idx_subscriptions_payment_id;
DROP INDEX IF EXISTS public.idx_supplier_documents_reviewed_by;
DROP INDEX IF EXISTS public.idx_wallet_transactions_payment_id;
DROP INDEX IF EXISTS public.idx_demo_listing_photos_listing;
DROP INDEX IF EXISTS public.idx_demo_listing_photos_uploaded_by;
DROP INDEX IF EXISTS public.idx_user_promo_created_at;
