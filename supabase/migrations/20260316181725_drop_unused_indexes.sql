/*
  # Drop unused indexes

  These indexes have never been used by the query planner and add unnecessary
  write overhead on INSERT/UPDATE/DELETE operations.

  Dropped indexes:
  - idx_parts_listings_supplier
  - idx_equipment_rentals_provider
  - idx_service_history_machine
  - idx_user_payments_user
  - idx_contact_credits_user
  - idx_contact_history_user
  - idx_payment_methods_active
*/

DROP INDEX IF EXISTS public.idx_parts_listings_supplier;
DROP INDEX IF EXISTS public.idx_equipment_rentals_provider;
DROP INDEX IF EXISTS public.idx_service_history_machine;
DROP INDEX IF EXISTS public.idx_user_payments_user;
DROP INDEX IF EXISTS public.idx_contact_credits_user;
DROP INDEX IF EXISTS public.idx_contact_history_user;
DROP INDEX IF EXISTS public.idx_payment_methods_active;
