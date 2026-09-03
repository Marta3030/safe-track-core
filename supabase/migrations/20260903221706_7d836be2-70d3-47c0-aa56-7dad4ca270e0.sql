-- =========================================================
-- Safety360 HSEQ · Arquitectura de datos (Fase 2)
-- =========================================================

-- ---------- ENUMS ----------
CREATE TYPE public.case_type AS ENUM ('accidente','incidente','cuasi_accidente','enfermedad_profesional','condicion_insegura');
CREATE TYPE public.case_severity AS ENUM ('leve','moderada','grave','fatal');
CREATE TYPE public.case_status AS ENUM ('borrador','reportado','en_investigacion','plan_accion','verificacion','cerrado','anulado');
CREATE TYPE public.action_status AS ENUM ('pendiente','en_progreso','completada','verificada','vencida','cancelada');
CREATE TYPE public.priority_level AS ENUM ('baja','media','alta','critica');
CREATE TYPE public.risk_level AS ENUM ('bajo','medio','alto','critico');
CREATE TYPE public.training_status AS ENUM ('planificada','en_curso','realizada','cancelada');
CREATE TYPE public.cause_type AS ENUM ('inmediata','basica','raiz');
CREATE TYPE public.control_type AS ENUM ('eliminacion','sustitucion','ingenieria','administrativo','epp');

-- ---------- HELPERS ----------
CREATE OR REPLACE FUNCTION public.is_hse_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'administrador') OR public.has_role(_user_id,'prevencionista');
$$;

-- =========================================================
-- CASES
-- =========================================================
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES public.work_centers(id) ON DELETE SET NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  code text NOT NULL,
  type public.case_type NOT NULL DEFAULT 'incidente',
  status public.case_status NOT NULL DEFAULT 'borrador',
  severity public.case_severity NOT NULL DEFAULT 'leve',
  title text NOT NULL,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reported_at timestamptz NOT NULL DEFAULT now(),
  location_detail text,
  affected_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  affected_person_name text,
  affected_person_job text,
  lost_days integer NOT NULL DEFAULT 0 CHECK (lost_days >= 0),
  immediate_actions text,
  requires_investigation boolean NOT NULL DEFAULT true,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  CONSTRAINT cases_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX idx_cases_org ON public.cases(organization_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_type ON public.cases(type);
CREATE INDEX idx_cases_severity ON public.cases(severity);
CREATE INDEX idx_cases_occurred_at ON public.cases(occurred_at DESC);
CREATE INDEX idx_cases_work_center ON public.cases(work_center_id);
CREATE INDEX idx_cases_area ON public.cases(area_id);
CREATE INDEX idx_cases_assigned_to ON public.cases(assigned_to);
CREATE INDEX idx_cases_reported_by ON public.cases(reported_by);
CREATE INDEX idx_cases_deleted_at ON public.cases(deleted_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_select_auth ON public.cases FOR SELECT TO authenticated USING (true);
CREATE POLICY cases_insert ON public.cases FOR INSERT TO authenticated
  WITH CHECK (public.is_hse_manager(auth.uid()) OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY cases_update ON public.cases FOR UPDATE TO authenticated
  USING (public.is_hse_manager(auth.uid()) OR (public.has_role(auth.uid(),'supervisor') AND (reported_by = auth.uid() OR assigned_to = auth.uid())))
  WITH CHECK (public.is_hse_manager(auth.uid()) OR (public.has_role(auth.uid(),'supervisor') AND (reported_by = auth.uid() OR assigned_to = auth.uid())));
CREATE POLICY cases_delete ON public.cases FOR DELETE TO authenticated
  USING (public.is_hse_manager(auth.uid()));

-- correlativo automático por organización
CREATE OR REPLACE FUNCTION public.set_case_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  prefix text;
  next_seq integer;
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> '' THEN RETURN NEW; END IF;
  prefix := CASE NEW.type
    WHEN 'accidente' THEN 'ACC'
    WHEN 'incidente' THEN 'INC'
    WHEN 'cuasi_accidente' THEN 'CUA'
    WHEN 'enfermedad_profesional' THEN 'ENF'
    ELSE 'CON' END;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'^[A-Z]{3}-\d{4}-',''),'')::int),0) + 1
    INTO next_seq
  FROM public.cases
  WHERE organization_id = NEW.organization_id
    AND code LIKE prefix || '-' || to_char(NEW.occurred_at,'YYYY') || '-%';
  NEW.code := prefix || '-' || to_char(NEW.occurred_at,'YYYY') || '-' || lpad(next_seq::text,4,'0');
  RETURN NEW;
END;
$$;

ALTER TABLE public.cases ALTER COLUMN code DROP NOT NULL;
CREATE TRIGGER trg_cases_code BEFORE INSERT ON public.cases FOR EACH ROW EXECUTE FUNCTION public.set_case_code();
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CASE EVIDENCES
-- =========================================================
CREATE TABLE public.case_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_case_evidences_case ON public.case_evidences(case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_evidences TO authenticated;
GRANT ALL ON public.case_evidences TO service_role;
ALTER TABLE public.case_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_evidences_select ON public.case_evidences FOR SELECT TO authenticated USING (true);
CREATE POLICY case_evidences_write ON public.case_evidences FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_hse_manager(auth.uid()) OR created_by = auth.uid());
CREATE TRIGGER trg_case_evidences_updated BEFORE UPDATE ON public.case_evidences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- INVESTIGATIONS
-- =========================================================
CREATE TABLE public.investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  methodology text NOT NULL DEFAULT 'arbol_causas',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  lead_investigator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team text,
  facts_summary text,
  conclusions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_investigations_case ON public.investigations(case_id);
CREATE INDEX idx_investigations_lead ON public.investigations(lead_investigator_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY investigations_select ON public.investigations FOR SELECT TO authenticated USING (true);
CREATE POLICY investigations_write ON public.investigations FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid()) OR lead_investigator_id = auth.uid())
  WITH CHECK (public.is_hse_manager(auth.uid()) OR lead_investigator_id = auth.uid());
CREATE TRIGGER trg_investigations_updated BEFORE UPDATE ON public.investigations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- INVESTIGATION CAUSES
-- =========================================================
CREATE TABLE public.investigation_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  cause_type public.cause_type NOT NULL DEFAULT 'inmediata',
  category text,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_causes_investigation ON public.investigation_causes(investigation_id);
CREATE INDEX idx_causes_type ON public.investigation_causes(cause_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigation_causes TO authenticated;
GRANT ALL ON public.investigation_causes TO service_role;
ALTER TABLE public.investigation_causes ENABLE ROW LEVEL SECURITY;
CREATE POLICY causes_select ON public.investigation_causes FOR SELECT TO authenticated USING (true);
CREATE POLICY causes_write ON public.investigation_causes FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid())) WITH CHECK (public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_causes_updated BEFORE UPDATE ON public.investigation_causes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- HAZARDS (MIPER)
-- =========================================================
CREATE TABLE public.hazards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES public.work_centers(id) ON DELETE SET NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  process text,
  activity text NOT NULL,
  is_routine boolean NOT NULL DEFAULT true,
  hazard text NOT NULL,
  risk text NOT NULL,
  existing_controls text,
  probability integer NOT NULL DEFAULT 1 CHECK (probability BETWEEN 1 AND 5),
  consequence integer NOT NULL DEFAULT 1 CHECK (consequence BETWEEN 1 AND 5),
  risk_score integer GENERATED ALWAYS AS (probability * consequence) STORED,
  risk_level public.risk_level NOT NULL DEFAULT 'bajo',
  proposed_controls text,
  residual_probability integer CHECK (residual_probability BETWEEN 1 AND 5),
  residual_consequence integer CHECK (residual_consequence BETWEEN 1 AND 5),
  residual_risk_level public.risk_level,
  legal_requirements text,
  source_case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);
CREATE INDEX idx_hazards_org ON public.hazards(organization_id);
CREATE INDEX idx_hazards_work_center ON public.hazards(work_center_id);
CREATE INDEX idx_hazards_area ON public.hazards(area_id);
CREATE INDEX idx_hazards_risk_level ON public.hazards(risk_level);
CREATE INDEX idx_hazards_source_case ON public.hazards(source_case_id);
CREATE INDEX idx_hazards_next_review ON public.hazards(next_review_at);
CREATE INDEX idx_hazards_deleted_at ON public.hazards(deleted_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hazards TO authenticated;
GRANT ALL ON public.hazards TO service_role;
ALTER TABLE public.hazards ENABLE ROW LEVEL SECURITY;
CREATE POLICY hazards_select ON public.hazards FOR SELECT TO authenticated USING (true);
CREATE POLICY hazards_write ON public.hazards FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid())) WITH CHECK (public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_hazards_updated BEFORE UPDATE ON public.hazards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- nivel de riesgo automático
CREATE OR REPLACE FUNCTION public.set_hazard_risk_level()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE s int; r int;
BEGIN
  s := NEW.probability * NEW.consequence;
  NEW.risk_level := CASE WHEN s >= 15 THEN 'critico' WHEN s >= 9 THEN 'alto' WHEN s >= 4 THEN 'medio' ELSE 'bajo' END::public.risk_level;
  IF NEW.residual_probability IS NOT NULL AND NEW.residual_consequence IS NOT NULL THEN
    r := NEW.residual_probability * NEW.residual_consequence;
    NEW.residual_risk_level := CASE WHEN r >= 15 THEN 'critico' WHEN r >= 9 THEN 'alto' WHEN r >= 4 THEN 'medio' ELSE 'bajo' END::public.risk_level;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_hazards_risk_level BEFORE INSERT OR UPDATE ON public.hazards FOR EACH ROW EXECUTE FUNCTION public.set_hazard_risk_level();

-- =========================================================
-- ACTION PLANS
-- =========================================================
CREATE TABLE public.action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  hazard_id uuid REFERENCES public.hazards(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status public.action_status NOT NULL DEFAULT 'pendiente',
  priority public.priority_level NOT NULL DEFAULT 'media',
  due_date date,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);
CREATE INDEX idx_action_plans_org ON public.action_plans(organization_id);
CREATE INDEX idx_action_plans_case ON public.action_plans(case_id);
CREATE INDEX idx_action_plans_hazard ON public.action_plans(hazard_id);
CREATE INDEX idx_action_plans_status ON public.action_plans(status);
CREATE INDEX idx_action_plans_due_date ON public.action_plans(due_date);
CREATE INDEX idx_action_plans_owner ON public.action_plans(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plans TO authenticated;
GRANT ALL ON public.action_plans TO service_role;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_plans_select ON public.action_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY action_plans_write ON public.action_plans FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid()) OR owner_id = auth.uid())
  WITH CHECK (public.is_hse_manager(auth.uid()) OR owner_id = auth.uid());
CREATE TRIGGER trg_action_plans_updated BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ACTIONS
-- =========================================================
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  description text NOT NULL,
  control_type public.control_type NOT NULL DEFAULT 'administrativo',
  responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  status public.action_status NOT NULL DEFAULT 'pendiente',
  priority public.priority_level NOT NULL DEFAULT 'media',
  progress_notes text,
  evidence_path text,
  completed_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_actions_plan ON public.actions(action_plan_id);
CREATE INDEX idx_actions_status ON public.actions(status);
CREATE INDEX idx_actions_due_date ON public.actions(due_date);
CREATE INDEX idx_actions_responsible ON public.actions(responsible_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY actions_select ON public.actions FOR SELECT TO authenticated USING (true);
CREATE POLICY actions_insert ON public.actions FOR INSERT TO authenticated
  WITH CHECK (public.is_hse_manager(auth.uid()));
CREATE POLICY actions_update ON public.actions FOR UPDATE TO authenticated
  USING (public.is_hse_manager(auth.uid()) OR responsible_id = auth.uid())
  WITH CHECK (public.is_hse_manager(auth.uid()) OR responsible_id = auth.uid());
CREATE POLICY actions_delete ON public.actions FOR DELETE TO authenticated
  USING (public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_actions_updated BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TRAININGS
-- =========================================================
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_center_id uuid REFERENCES public.work_centers(id) ON DELETE SET NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  training_type text,
  description text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  duration_hours numeric(5,2) NOT NULL DEFAULT 1 CHECK (duration_hours > 0),
  instructor text,
  status public.training_status NOT NULL DEFAULT 'planificada',
  source_case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);
CREATE INDEX idx_trainings_org ON public.trainings(organization_id);
CREATE INDEX idx_trainings_status ON public.trainings(status);
CREATE INDEX idx_trainings_scheduled ON public.trainings(scheduled_at DESC);
CREATE INDEX idx_trainings_work_center ON public.trainings(work_center_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY trainings_select ON public.trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY trainings_write ON public.trainings FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid())) WITH CHECK (public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_trainings_updated BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TRAINING ATTENDEES
-- =========================================================
CREATE TABLE public.training_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_name text,
  attended boolean NOT NULL DEFAULT false,
  score numeric(5,2) CHECK (score >= 0 AND score <= 100),
  certificate_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT training_attendee_unique UNIQUE (training_id, profile_id)
);
CREATE INDEX idx_attendees_training ON public.training_attendees(training_id);
CREATE INDEX idx_attendees_profile ON public.training_attendees(profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_attendees TO authenticated;
GRANT ALL ON public.training_attendees TO service_role;
ALTER TABLE public.training_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendees_select ON public.training_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY attendees_write ON public.training_attendees FOR ALL TO authenticated
  USING (public.is_hse_manager(auth.uid())) WITH CHECK (public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_attendees_updated BEFORE UPDATE ON public.training_attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
