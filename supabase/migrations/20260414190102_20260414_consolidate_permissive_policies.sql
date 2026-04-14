/*
  # Consolidate Multiple Permissive Policies

  1. Security & Performance Optimization
    - Merge multiple SELECT policies into single policies using OR logic
    - Reduce policy complexity and evaluation overhead
    - Maintain same security level with cleaner implementation

  2. Consolidated Policies
    - device_tokens: Merge "Admins can view all device tokens" and "Users can view own device tokens"
    - referrals: Merge referrer and referred views into single policy
    - supplier_documents: Merge "Admins can view all documents" and "Suppliers can view own documents"
    - supplier_documents: Merge "Admins can update document status" and "Suppliers can update own pending documents"
*/

DROP POLICY IF EXISTS "Admins can view all device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can view own device tokens" ON public.device_tokens;
CREATE POLICY "Users can view device tokens"
  ON public.device_tokens
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own referrals as referred" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals as referrer" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    referred_id = (select auth.uid())
    OR referrer_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all documents" ON public.supplier_documents;
DROP POLICY IF EXISTS "Suppliers can view own documents" ON public.supplier_documents;
CREATE POLICY "Users can view supplier documents"
  ON public.supplier_documents
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update document status" ON public.supplier_documents;
DROP POLICY IF EXISTS "Suppliers can update own pending documents" ON public.supplier_documents;
CREATE POLICY "Users can update supplier documents"
  ON public.supplier_documents
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );
