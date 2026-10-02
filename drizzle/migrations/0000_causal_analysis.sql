ALTER TYPE public.cause_type ADD VALUE IF NOT EXISTS 'organizacional';

ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS root_cause_conclusion text,
  ADD COLUMN IF NOT EXISTS root_cause_confirmed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS root_cause_confirmed_at timestamptz;

ALTER TABLE public.investigation_causes
  ADD COLUMN IF NOT EXISTS requires_action boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS why_analysis_id uuid;

ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS cause_id uuid REFERENCES public.investigation_causes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_actions_cause ON public.actions(cause_id);

CREATE TABLE public.investigation_why_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  problem text NOT NULL,
  whys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigation_why_analyses TO authenticated;
GRANT ALL ON public.investigation_why_analyses TO service_role;
ALTER TABLE public.investigation_why_analyses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_why_inv ON public.investigation_why_analyses(investigation_id);
CREATE TRIGGER trg_why_updated BEFORE UPDATE ON public.investigation_why_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.investigation_causes
  ADD CONSTRAINT investigation_causes_why_fk FOREIGN KEY (why_analysis_id) REFERENCES public.investigation_why_analyses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.investigation_in_my_org(_inv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = _inv AND public.case_in_my_org(i.case_id));
$$;
CREATE OR REPLACE FUNCTION public.can_edit_investigation(_inv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.investigation_in_my_org(_inv) AND (public.is_hse_manager(auth.uid())
    OR EXISTS (SELECT 1 FROM public.investigations i WHERE i.id = _inv AND i.lead_investigator_id = auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.investigation_in_my_org(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_investigation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.investigation_in_my_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_investigation(uuid) TO authenticated, service_role;

CREATE POLICY why_select ON public.investigation_why_analyses FOR SELECT TO authenticated USING (public.investigation_in_my_org(investigation_id));
CREATE POLICY why_write ON public.investigation_why_analyses FOR ALL TO authenticated USING (public.can_edit_investigation(investigation_id)) WITH CHECK (public.can_edit_investigation(investigation_id));

DROP POLICY IF EXISTS causes_write ON public.investigation_causes;
CREATE POLICY causes_write ON public.investigation_causes FOR ALL TO authenticated USING (public.can_edit_investigation(investigation_id)) WITH CHECK (public.can_edit_investigation(investigation_id));

CREATE TABLE public.causal_analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id uuid,
  operation text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid DEFAULT auth.uid(),
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.causal_analysis_history TO authenticated;
GRANT ALL ON public.causal_analysis_history TO service_role;
ALTER TABLE public.causal_analysis_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cah_inv ON public.causal_analysis_history(investigation_id, changed_at DESC);
CREATE POLICY cah_select ON public.causal_analysis_history FOR SELECT TO authenticated USING (public.investigation_in_my_org(investigation_id));

CREATE OR REPLACE FUNCTION public.log_causal_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv uuid; rec_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'investigations' THEN
    IF NEW.root_cause_conclusion IS NOT DISTINCT FROM OLD.root_cause_conclusion
       AND NEW.root_cause_confirmed_at IS NOT DISTINCT FROM OLD.root_cause_confirmed_at THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.causal_analysis_history(investigation_id, entity, entity_id, operation, old_data, new_data)
    VALUES (NEW.id, 'conclusion', NEW.id, 'UPDATE',
      jsonb_build_object('root_cause_conclusion', OLD.root_cause_conclusion, 'root_cause_confirmed_at', OLD.root_cause_confirmed_at),
      jsonb_build_object('root_cause_conclusion', NEW.root_cause_conclusion, 'root_cause_confirmed_at', NEW.root_cause_confirmed_at));
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN inv := OLD.investigation_id; rec_id := OLD.id; ELSE inv := NEW.investigation_id; rec_id := NEW.id; END IF;
  INSERT INTO public.causal_analysis_history(investigation_id, entity, entity_id, operation, old_data, new_data)
  VALUES (inv, CASE TG_TABLE_NAME WHEN 'investigation_causes' THEN 'cause' ELSE 'five_whys' END, rec_id, TG_OP,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_causal_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_causes_history AFTER INSERT OR UPDATE OR DELETE ON public.investigation_causes FOR EACH ROW EXECUTE FUNCTION public.log_causal_change();
CREATE TRIGGER trg_why_history AFTER INSERT OR UPDATE OR DELETE ON public.investigation_why_analyses FOR EACH ROW EXECUTE FUNCTION public.log_causal_change();
CREATE TRIGGER trg_conclusion_history AFTER UPDATE ON public.investigations FOR EACH ROW EXECUTE FUNCTION public.log_causal_change();