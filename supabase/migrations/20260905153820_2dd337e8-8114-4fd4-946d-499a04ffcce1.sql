ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS event_sequence text,
  ADD COLUMN IF NOT EXISTS conditions_description text,
  ADD COLUMN IF NOT EXISTS equipment_involved text,
  ADD COLUMN IF NOT EXISTS procedures_review text,
  ADD COLUMN IF NOT EXISTS prior_training text,
  ADD COLUMN IF NOT EXISTS existing_controls text,
  ADD COLUMN IF NOT EXISTS observations text;

CREATE TABLE IF NOT EXISTS public.investigation_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  interviewee_name text NOT NULL,
  interviewee_role text,
  relation_to_event text,
  interviewed_at timestamptz NOT NULL DEFAULT now(),
  statement text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_interviews_investigation ON public.investigation_interviews(investigation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigation_interviews TO authenticated;
GRANT ALL ON public.investigation_interviews TO service_role;

ALTER TABLE public.investigation_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interviews_select" ON public.investigation_interviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "interviews_write" ON public.investigation_interviews
  FOR ALL TO authenticated
  USING (
    public.is_hse_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.investigations i
      WHERE i.id = investigation_id AND i.lead_investigator_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_hse_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.investigations i
      WHERE i.id = investigation_id AND i.lead_investigator_id = auth.uid()
    )
  );

CREATE TRIGGER trg_interviews_updated
  BEFORE UPDATE ON public.investigation_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();