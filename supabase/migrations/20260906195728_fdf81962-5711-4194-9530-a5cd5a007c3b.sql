ALTER TABLE public.case_evidences
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_case_evidences_case ON public.case_evidences(case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidences_deleted_at ON public.case_evidences(deleted_at);

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.case_in_my_org(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = _case_id
      AND c.organization_id = public.current_org_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.case_in_my_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.case_in_my_org(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS case_evidences_select ON public.case_evidences;
DROP POLICY IF EXISTS case_evidences_write ON public.case_evidences;

CREATE POLICY case_evidences_select ON public.case_evidences
  FOR SELECT TO authenticated
  USING (public.case_in_my_org(case_id));

CREATE POLICY case_evidences_insert ON public.case_evidences
  FOR INSERT TO authenticated
  WITH CHECK (public.case_in_my_org(case_id) AND created_by = auth.uid());

CREATE POLICY case_evidences_update ON public.case_evidences
  FOR UPDATE TO authenticated
  USING (public.case_in_my_org(case_id) AND (public.is_hse_manager(auth.uid()) OR created_by = auth.uid()))
  WITH CHECK (public.case_in_my_org(case_id) AND (public.is_hse_manager(auth.uid()) OR created_by = auth.uid()));

CREATE POLICY case_evidences_delete ON public.case_evidences
  FOR DELETE TO authenticated
  USING (public.case_in_my_org(case_id) AND (public.is_hse_manager(auth.uid()) OR created_by = auth.uid()));

DROP POLICY IF EXISTS case_evidences_storage_select ON storage.objects;
DROP POLICY IF EXISTS case_evidences_storage_insert ON storage.objects;
DROP POLICY IF EXISTS case_evidences_storage_update ON storage.objects;
DROP POLICY IF EXISTS case_evidences_storage_delete ON storage.objects;

CREATE POLICY case_evidences_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'case-evidences' AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY case_evidences_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-evidences' AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY case_evidences_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'case-evidences' AND (storage.foldername(name))[1] = public.current_org_id()::text)
  WITH CHECK (bucket_id = 'case-evidences' AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY case_evidences_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'case-evidences' AND (storage.foldername(name))[1] = public.current_org_id()::text);