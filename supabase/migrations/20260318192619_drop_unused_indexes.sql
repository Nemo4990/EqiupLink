/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used by the query planner.
  These indexes consume storage and slow down writes without providing
  any read performance benefit.

  ## Indexes dropped
  - active_jobs: customer_id, technician_id
  - boosted_listings: listing_id, supplier_id
  - breakdown_requests: assigned_mechanic_id, machine_id
  - commissions: technician_id
  - contact_history: payment_id, provider_id
  - contact_unlocks: unlocker_id
  - equipment_rentals: provider_id
  - forum_replies: parent_reply_id
  - job_unlocks: breakdown_request_id
  - machines: owner_id
  - offers: customer_id, technician_id
  - parts_listings: supplier_id
  - quotes: owner_id, technician_id
  - rental_provider_profiles: user_id
  - reviews: breakdown_request_id, mechanic_id, reviewer_id
  - service_history: breakdown_request_id, machine_id, mechanic_id, owner_id
  - subscriptions: user_id
  - supplier_profiles: user_id
  - user_payments: provider_id, reviewed_by, user_id
  - wallet_transactions: user_id, wallet_id
  - access_grants: user_id
*/

DROP INDEX IF EXISTS public.idx_active_jobs_customer_id;
DROP INDEX IF EXISTS public.idx_active_jobs_technician_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_listing_id;
DROP INDEX IF EXISTS public.idx_boosted_listings_supplier_id;
DROP INDEX IF EXISTS public.idx_breakdown_requests_assigned_mechanic_id;
DROP INDEX IF EXISTS public.idx_breakdown_requests_machine_id;
DROP INDEX IF EXISTS public.idx_commissions_technician_id;
DROP INDEX IF EXISTS public.idx_contact_history_payment_id;
DROP INDEX IF EXISTS public.idx_contact_history_provider_id;
DROP INDEX IF EXISTS public.idx_contact_unlocks_unlocker_id;
DROP INDEX IF EXISTS public.idx_equipment_rentals_provider_id;
DROP INDEX IF EXISTS public.idx_forum_replies_parent_reply_id;
DROP INDEX IF EXISTS public.idx_job_unlocks_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_machines_owner_id;
DROP INDEX IF EXISTS public.idx_offers_customer_id;
DROP INDEX IF EXISTS public.idx_offers_technician_id;
DROP INDEX IF EXISTS public.idx_parts_listings_supplier_id;
DROP INDEX IF EXISTS public.idx_quotes_owner_id;
DROP INDEX IF EXISTS public.idx_quotes_technician_id;
DROP INDEX IF EXISTS public.idx_rental_provider_profiles_user_id;
DROP INDEX IF EXISTS public.idx_reviews_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_reviews_mechanic_id;
DROP INDEX IF EXISTS public.idx_reviews_reviewer_id;
DROP INDEX IF EXISTS public.idx_service_history_breakdown_request_id;
DROP INDEX IF EXISTS public.idx_service_history_machine_id;
DROP INDEX IF EXISTS public.idx_service_history_mechanic_id;
DROP INDEX IF EXISTS public.idx_service_history_owner_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_supplier_profiles_user_id;
DROP INDEX IF EXISTS public.idx_user_payments_provider_id;
DROP INDEX IF EXISTS public.idx_user_payments_reviewed_by;
DROP INDEX IF EXISTS public.idx_user_payments_user_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_user_id;
DROP INDEX IF EXISTS public.idx_wallet_transactions_wallet_id;
DROP INDEX IF EXISTS public.idx_access_grants_user_id;
