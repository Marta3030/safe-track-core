ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_id uuid REFERENCES public.actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hazard_id uuid REFERENCES public.hazards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS evidence_path text,
  ADD COLUMN IF NOT EXISTS evidence_name text;
CREATE INDEX IF NOT EXISTS idx_trainings_case ON public.trainings(source_case_id);
CREATE INDEX IF NOT EXISTS idx_trainings_action ON public.trainings(action_id);
CREATE INDEX IF NOT EXISTS idx_trainings_hazard ON public.trainings(hazard_id);

DROP POLICY IF EXISTS trainings_select ON public.trainings;
DROP POLICY IF EXISTS trainings_write ON public.trainings;
CREATE POLICY trainings_select ON public.trainings FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY trainings_write ON public.trainings FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()));

DROP POLICY IF EXISTS attendees_select ON public.training_attendees;
DROP POLICY IF EXISTS attendees_write ON public.training_attendees;
CREATE POLICY attendees_select ON public.training_attendees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.organization_id = public.current_org_id()));
CREATE POLICY attendees_write ON public.training_attendees FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid()) AND EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.organization_id = public.current_org_id()))
  WITH CHECK (public.is_hse_manager(auth.uid()) AND EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.organization_id = public.current_org_id()));

CREATE OR REPLACE FUNCTION public.block_case_close_pending_training()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cerrado' AND OLD.status IS DISTINCT FROM 'cerrado' AND EXISTS (
    SELECT 1 FROM public.trainings t
    WHERE t.source_case_id = NEW.id AND t.is_mandatory AND t.deleted_at IS NULL
      AND t.status IN ('planificada','en_curso')
  ) THEN
    RAISE EXCEPTION 'No se puede cerrar el caso: existe capacitación obligatoria pendiente';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_cases_block_close_training ON public.cases;
CREATE TRIGGER trg_cases_block_close_training BEFORE UPDATE OF status ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.block_case_close_pending_training();