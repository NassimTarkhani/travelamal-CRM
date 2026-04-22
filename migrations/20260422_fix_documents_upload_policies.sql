-- Migration: Fix documents upload reliability policies
-- Date: 2026-04-22

BEGIN;

-- Ensure storage bucket exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies for client-documents bucket.
DROP POLICY IF EXISTS "client_docs_insert_authenticated" ON storage.objects;
CREATE POLICY "client_docs_insert_authenticated"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "client_docs_select_authenticated" ON storage.objects;
CREATE POLICY "client_docs_select_authenticated"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "client_docs_update_authenticated" ON storage.objects;
CREATE POLICY "client_docs_update_authenticated"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "client_docs_delete_authenticated" ON storage.objects;
CREATE POLICY "client_docs_delete_authenticated"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.uid() IS NOT NULL
  );

-- Documents table policies/indexes should only be applied after the table exists.
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    -- Ensure RLS is on for documents table.
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    -- Normalize/replace potentially conflicting old policies.
    DROP POLICY IF EXISTS "Documents admin full access" ON public.documents;
    DROP POLICY IF EXISTS "Documents employe select" ON public.documents;
    DROP POLICY IF EXISTS "Documents employe insert" ON public.documents;
    DROP POLICY IF EXISTS "Documents employe update" ON public.documents;
    DROP POLICY IF EXISTS "documents_admin_full_access" ON public.documents;
    DROP POLICY IF EXISTS "documents_staff_select" ON public.documents;
    DROP POLICY IF EXISTS "documents_staff_insert" ON public.documents;
    DROP POLICY IF EXISTS "documents_staff_update" ON public.documents;

    -- Admin full access.
    CREATE POLICY "documents_admin_full_access"
      ON public.documents
      FOR ALL
      USING (public.current_user_role() = 'Admin')
      WITH CHECK (public.current_user_role() = 'Admin');

    -- Staff read.
    CREATE POLICY "documents_staff_select"
      ON public.documents
      FOR SELECT
      USING (public.current_user_role() = 'Employé');

    -- Staff insert, constrained to own uploads.
    CREATE POLICY "documents_staff_insert"
      ON public.documents
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND public.current_user_role() = 'Employé'
        AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
      );

    -- Staff update, constrained to own uploads.
    CREATE POLICY "documents_staff_update"
      ON public.documents
      FOR UPDATE
      USING (
        public.current_user_role() = 'Employé'
        AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
      )
      WITH CHECK (
        public.current_user_role() = 'Employé'
        AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
      );

    -- Helpful index for client document fetches.
    CREATE INDEX IF NOT EXISTS idx_documents_client_id_upload_date
      ON public.documents (client_id, upload_date DESC);
  END IF;
END $$;

COMMIT;
