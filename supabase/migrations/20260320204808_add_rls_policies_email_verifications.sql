/*
  # Add RLS Policies for email_verifications Table

  ## Summary
  The email_verifications table had RLS enabled but no policies, meaning no one could
  access it. This adds the minimum required policies for legitimate access patterns.

  ## Policies Added
  - Users can read their own verification records
  - Users can insert their own verification records
  - Users can update their own verification records (e.g., to mark as used)
  - Service role / edge functions handle token lookup via service key (bypasses RLS)

  ## Notes
  - Token-based lookups (verify-email edge function) use the service role key which bypasses RLS
  - Direct client access is scoped to the authenticated user's own records only
*/

CREATE POLICY "Users can read own email verifications"
  ON public.email_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email verifications"
  ON public.email_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email verifications"
  ON public.email_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
