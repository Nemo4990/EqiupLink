/*
  # Add indexes for unindexed foreign keys

  Adds covering indexes on all foreign key columns that were missing them.
  This improves JOIN and cascade operation performance.

  Tables affected:
  - breakdown_requests: assigned_mechanic_id, machine_id
  - contact_history: payment_id, provider_id
  - machines: owner_id
  - rental_provider_profiles: user_id
  - reviews: breakdown_request_id, mechanic_id, reviewer_id
  - service_history: breakdown_request_id, mechanic_id, owner_id
  - supplier_profiles: user_id
  - user_payments: provider_id, reviewed_by
*/

CREATE INDEX IF NOT EXISTS idx_breakdown_requests_assigned_mechanic ON public.breakdown_requests (assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_requests_machine ON public.breakdown_requests (machine_id);

CREATE INDEX IF NOT EXISTS idx_contact_history_payment ON public.contact_history (payment_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_provider ON public.contact_history (provider_id);

CREATE INDEX IF NOT EXISTS idx_machines_owner ON public.machines (owner_id);

CREATE INDEX IF NOT EXISTS idx_rental_provider_profiles_user ON public.rental_provider_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_breakdown_request ON public.reviews (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_mechanic ON public.reviews (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_service_history_breakdown_request ON public.service_history (breakdown_request_id);
CREATE INDEX IF NOT EXISTS idx_service_history_mechanic ON public.service_history (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_service_history_owner ON public.service_history (owner_id);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_user ON public.supplier_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_payments_provider ON public.user_payments (provider_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_reviewed_by ON public.user_payments (reviewed_by);
