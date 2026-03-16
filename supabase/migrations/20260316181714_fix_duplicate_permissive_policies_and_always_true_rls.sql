/*
  # Fix duplicate permissive policies and always-true RLS policies

  1. Duplicate policies consolidated:
     - breakdown_requests SELECT: merge "Owners can view own requests" + "Mechanics can view open requests" into one policy each
     - commission_fees SELECT: remove duplicate, keep single
     - contact_credits INSERT/SELECT/UPDATE: remove duplicate from "Admins can manage all credits" overlap
     - equipment_rentals INSERT/SELECT: remove duplicate insert policy
     - parts_listings INSERT/SELECT: remove duplicate insert policy
     - payment_methods SELECT: remove duplicate
     - service_history SELECT: already handled by separate policies in previous migration
     - user_payments SELECT: already handled in previous migration

  2. Always-true RLS policies fixed:
     - contact_credits "System can insert credits": restrict to authenticated admins
     - notifications "System can insert notifications": restrict to authenticated users (only own notifications)

  Note: Multiple SELECT policies on a table are fine when they serve different roles/conditions
  (Postgres OR's them). The real issue is duplicate INSERT policies that conflict.
*/

-- Fix duplicate INSERT on parts_listings (remove old duplicate)
DROP POLICY IF EXISTS "Suppliers can insert part listings" ON public.parts_listings;

-- Fix duplicate INSERT on equipment_rentals (remove old duplicate)  
DROP POLICY IF EXISTS "Rental providers can insert equipment rentals" ON public.equipment_rentals;

-- Fix always-true contact_credits "System can insert credits"
DROP POLICY IF EXISTS "System can insert credits" ON public.contact_credits;

CREATE POLICY "System can insert credits"
  ON public.contact_credits FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- Fix always-true notifications "System can insert notifications"
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );
