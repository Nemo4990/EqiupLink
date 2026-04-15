/*
  # Add Email Broadcast System

  ## Summary
  Enables admins to send professional emails to all users and tracks password reset requests.

  ## New Tables
  - `email_broadcasts`
    - `id` (uuid, primary key)
    - `admin_id` (uuid, foreign key to auth.users)
    - `subject` (text) - Email subject line
    - `html_content` (text) - HTML email body
    - `recipient_count` (integer) - Number of recipients
    - `sent_count` (integer) - Number successfully sent
    - `failed_count` (integer) - Number failed
    - `status` (text) - pending, sending, completed, failed
    - `scheduled_for` (timestamp) - When to send
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  - `email_logs`
    - `id` (uuid, primary key)
    - `broadcast_id` (uuid, foreign key to email_broadcasts)
    - `user_id` (uuid, foreign key to auth.users)
    - `email` (text) - Recipient email
    - `status` (text) - sent, failed
    - `error_message` (text) - Error details if failed
    - `created_at` (timestamp)

  - `password_reset_tokens`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `token` (text, unique) - Reset token
    - `expires_at` (timestamp) - Token expiration
    - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Only admins can create broadcasts
  - Users can only see their own password reset tokens
*/

CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  html_content text NOT NULL,
  recipient_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  scheduled_for timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_admin_id ON public.email_broadcasts(admin_id);
CREATE INDEX IF NOT EXISTS idx_email_broadcasts_status ON public.email_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_broadcast_id ON public.email_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view broadcasts"
  ON public.email_broadcasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create broadcasts"
  ON public.email_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update broadcasts"
  ON public.email_broadcasts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can view email logs"
  ON public.email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own password reset tokens"
  ON public.password_reset_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create password reset tokens"
  ON public.password_reset_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their password reset tokens"
  ON public.password_reset_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
