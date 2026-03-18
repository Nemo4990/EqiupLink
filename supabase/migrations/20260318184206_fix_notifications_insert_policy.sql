/*
  # Fix notifications INSERT policy

  The current policy only allows admins to insert notifications.
  This blocks features like review notifications, message alerts, etc.
  
  Fix: Allow any authenticated user to insert notifications for other users.
*/

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
