/*
  # Allow admins to insert notifications for any user

  1. Changes
    - Adds a new INSERT policy on notifications table
    - Allows users with the 'admin' role (from profiles) to insert notifications for any user_id

  2. Security
    - Checks that the inserting user has role = 'admin' in profiles table
    - Admins can send reminders / announcements to any user
*/

CREATE POLICY "Admins can insert notifications for any user"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );
