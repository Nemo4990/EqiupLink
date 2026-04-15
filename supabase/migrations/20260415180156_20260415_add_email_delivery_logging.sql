/*
  # Add Email Delivery Logging

  ## Summary
  Creates a table to track all email sending attempts for debugging and monitoring purposes.

  ## New Tables
  - `email_delivery_logs`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `email_to` (text) - Recipient email address
    - `email_from` (text) - Sender email address
    - `subject` (text) - Email subject
    - `status` (text) - pending, sent, failed
    - `error_message` (text) - Error details if failed
    - `response_code` (text) - HTTP response code from Resend
    - `created_at` (timestamp)

  ## Security
  - Enable RLS on the table
  - Only admins can view logs
  - System can insert logs
*/

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_to text NOT NULL,
  email_from text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  response_code text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_user_id ON public.email_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON public.email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON public.email_delivery_logs(created_at);

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email logs"
  ON public.email_delivery_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert email logs"
  ON public.email_delivery_logs FOR INSERT
  WITH CHECK (true);
