/*
  # Supplier Trade License Documents

  1. New Tables
    - `supplier_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to profiles)
      - `document_type` (text) - e.g. 'trade_license'
      - `file_url` (text) - storage URL of the uploaded document
      - `registered_name` (text) - business name on the license
      - `license_number` (text, nullable) - trade license number
      - `status` (text) - pending, approved, rejected
      - `reviewed_by` (uuid, nullable) - admin who reviewed
      - `reviewed_at` (timestamptz, nullable)
      - `rejection_reason` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Storage Bucket
    - `supplier-documents` (private bucket for trade license uploads)

  3. Security
    - Enable RLS on `supplier_documents` table
    - Suppliers can insert and view their own documents
    - Admins can view and update all documents
    - Storage policies for authenticated uploads and public reads by admin

  4. Profile Changes
    - Add `trade_license_status` column to profiles for quick access checks
*/

-- Create supplier_documents table
CREATE TABLE IF NOT EXISTS supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'trade_license',
  file_url text NOT NULL,
  registered_name text NOT NULL,
  license_number text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_doc_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Add index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_supplier_documents_user_id ON supplier_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_status ON supplier_documents(status);

-- Enable RLS
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;

-- Suppliers can view their own documents
CREATE POLICY "Suppliers can view own documents"
  ON supplier_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Suppliers can insert their own documents
CREATE POLICY "Suppliers can upload own documents"
  ON supplier_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Suppliers can update own pending documents (re-upload)
CREATE POLICY "Suppliers can update own pending documents"
  ON supplier_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all documents (via service role or admin check)
CREATE POLICY "Admins can view all documents"
  ON supplier_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update document status (approve/reject)
CREATE POLICY "Admins can update document status"
  ON supplier_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add trade_license_status to profiles for quick status checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trade_license_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trade_license_status text DEFAULT 'none';
  END IF;
END $$;

-- Create storage bucket for supplier documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-documents', 'supplier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own supplier docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own uploaded docs
CREATE POLICY "Users can view own supplier docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all supplier docs
CREATE POLICY "Admins can view all supplier docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
