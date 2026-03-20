/*
  # Fix Unindexed Foreign Keys (Batch 2)

  ## Summary
  Adds covering indexes for all foreign key columns that were flagged as unindexed.
  This improves JOIN and lookup performance across the following tables:

  1. active_jobs - customer_id, technician_id
  2. boosted_listings - listing_id, supplier_id
  3. breakdown_requests - assigned_mechanic_id, machine_id
  4. commissions - technician_id
  5. contact_history - payment_id, provider_id
  6. contact_unlocks - unlocker_id
  7. equipment_rentals - provider_id
  8. forum_replies - parent_reply_id
  9. job_unlocks - breakdown_request_id
  10. machines - owner_id
  11. offers - customer_id, technician_id
  12. parts_listings - supplier_id
  13. quotes - owner_id, technician_id
  14. rental_provider_profiles - user_id
  15. reviews - breakdown_request_id, mechanic_id, reviewer_id
  16. service_history - breakdown_request_id, machine_id, mechanic_id, owner_id
  17. subscriptions - user_id
  18. supplier_profiles - user_id
  19. user_payments - provider_id, reviewed_by, user_id
  20. wallet_transactions - user_id, wallet_id

  Uses IF NOT EXISTS to be safe on re-runs.
*/

CREATE INDEX IF NOT EXISTS idx_active_jobs_customer_id ON public.active_jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_active_jobs_technician_id ON public.active_jobs (technician_id);

CREATE INDEX IF NOT EXISTS idx_boosted_listings_listing_id ON public.boosted_listings (listing_id);
CREATE INDEX IF NOT EXISTS idx_boosted_listings_supplier_id ON public.boosted_listings (supplier_id);

CREATE INDEX IF NOT EXISTS idx_breakdown_requests_assigned_mechanic_id ON public.breakdown_requests (assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_machine_id ON public.breakdown_requests (machine_id);

CREATE INDEX IF NOT EXISTS idx_commissions_technician_id ON public.commissions (technician_id);

CREATE INDEX IF NOT EXISTS idx_contact_history_payment_id ON public.contact_history (payment_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_provider_id ON public.contact_history (provider_id);

CREATE INDEX IF NOT EXISTS idx_contact_unlocks_unlocker_id ON public.contact_unlocks (unlocker_id);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_provider_id ON public.equipment_rentals (provider_id);

CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_reply_id ON public.forum_replies (parent_reply_id);

CREATE INDEX IF NOT EXISTS idx_job_unlocks_breakdown_request_id ON public.job_unlocks (breakdown_request_id);

CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON public.machines (owner_id);

CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON public.offers (customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_technician_id ON public.offers (technician_id);

CREATE INDEX IF NOT EXISTS idx_parts_listings_supplier_id ON public.parts_listings (supplier_id);

CREATE INDEX IF NOT EXISTS idx_quotes_owner_id ON public.quotes (owner_id);
CREATE INDEX IF NOT EXISTS idx_quotes_technician_id ON public.quotes (technician_id);

CREATE INDEX IF NOT EXISTS idx_rental_provider_profiles_user_id ON public.rental_provider_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_breakdown_request_id ON public.reviews (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mechanic_id ON public.reviews (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_service_history_breakdown_request_id ON public.service_history (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_service_history_machine_id ON public.service_history (machine_id);
CREATE INDEX IF NOT EXISTS idx_service_history_mechanic_id ON public.service_history (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_service_history_owner_id ON public.service_history (owner_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_user_id ON public.supplier_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_payments_provider_id ON public.user_payments (provider_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_reviewed_by ON public.user_payments (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments (user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions (wallet_id);
