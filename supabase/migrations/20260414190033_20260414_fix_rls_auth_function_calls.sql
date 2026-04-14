/*
  # Fix RLS Auth Function Calls for Performance

  1. Security & Performance Optimization
    - Replace auth.<function>() with (select auth.<function>()) in RLS policies
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Policies Updated
    - demo_listing_photos: "Admins can manage demo listing photos"
    - user_promo_notifications: "Users can dismiss promo notification"
    - user_promo_notifications: "Users can read own promo notification status"
*/

DROP POLICY IF EXISTS "Admins can manage demo listing photos" ON public.demo_listing_photos;
CREATE POLICY "Admins can manage demo listing photos"
  ON public.demo_listing_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can dismiss promo notification" ON public.user_promo_notifications;
CREATE POLICY "Users can dismiss promo notification"
  ON public.user_promo_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own promo notification status" ON public.user_promo_notifications;
CREATE POLICY "Users can read own promo notification status"
  ON public.user_promo_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));
