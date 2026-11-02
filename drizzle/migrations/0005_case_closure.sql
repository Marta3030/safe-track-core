ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closure_observation text,
  ADD COLUMN IF NOT EXISTS closure_result text,
  ADD COLUMN IF NOT EXISTS final_report text,
  ADD COLUMN IF NOT EXISTS final_report_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_report_completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS miper_not_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS miper_na_reason text;

ALTER TABLE public.case_evidences
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE public.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  data jsonb,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_events_case ON public.case_events(case_id, created_at DESC);
GRANT SELECT ON public.case_events TO authenticated;
GRANT ALL ON public.case_events TO service_role;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_events_select ON public.case_events FOR SELECT TO authenticated
  USING (public.case_in_my_org(case_id));

CREATE OR REPLACE FUNCTION public.case_closure_checklist(_case_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.cases%ROWTYPE;
  n_ev int; n_ev_unver int; n_crit int; n_act int; n_act_open int; n_tr int; n_hz int;
  inv_done boolean; root_done boolean;
BEGIN
  SELECT * INTO c FROM public.cases WHERE id = _case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caso no encontrado'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.case_in_my_org(_case_id) THEN RAISE EXCEPTION 'Sin acceso'; END IF;

  SELECT bool_or(finished_at IS NOT NULL), bool_or(root_cause_confirmed_at IS NOT NULL)
    INTO inv_done, root_done FROM public.investigations WHERE case_id = _case_id;
  SELECT count(*), count(*) FILTER (WHERE verified_at IS NULL) INTO n_ev, n_ev_unver
    FROM public.case_evidences WHERE case_id = _case_id AND deleted_at IS NULL;
  SELECT count(*) FILTER (WHERE a.priority = 'critica' AND a.status NOT IN ('cerrada','verificada','cancelada')),
         count(*) FILTER (WHERE a.status <> 'cancelada'),
         count(*) FILTER (WHERE a.status NOT IN ('eficaz','cerrada','verificada','cancelada'))
    INTO n_crit, n_act, n_act_open
    FROM public.actions a JOIN public.action_plans p ON p.id = a.action_plan_id
    WHERE p.case_id = _case_id AND p.deleted_at IS NULL;
  SELECT count(*) INTO n_tr FROM public.trainings
    WHERE source_case_id = _case_id AND is_mandatory AND deleted_at IS NULL AND status IN ('planificada','en_curso');
  SELECT count(*) INTO n_hz FROM public.hazards WHERE source_case_id = _case_id AND deleted_at IS NULL;

  RETURN jsonb_build_array(
    jsonb_build_object('key','investigation','label','Investigación completada','ok',coalesce(inv_done,false),
      'detail', CASE WHEN coalesce(inv_done,false) THEN 'Investigación con fecha de término' ELSE 'Falta registrar la fecha de término de la investigación' END),
    jsonb_build_object('key','root_cause','label','Causa raíz definida','ok',coalesce(root_done,false),
      'detail', CASE WHEN coalesce(root_done,false) THEN 'Conclusión confirmada por el profesional' ELSE 'El profesional aún no confirma la conclusión de causa raíz' END),
    jsonb_build_object('key','critical_actions','label','Acciones críticas cerradas','ok',n_crit = 0,
      'detail', CASE WHEN n_crit = 0 THEN 'Sin acciones críticas abiertas' ELSE n_crit || ' acción(es) crítica(s) sin cerrar' END),
    jsonb_build_object('key','evidences','label','Evidencias verificadas','ok',n_ev > 0 AND n_ev_unver = 0,
      'detail', CASE WHEN n_ev = 0 THEN 'No hay evidencias cargadas' WHEN n_ev_unver > 0 THEN n_ev_unver || ' evidencia(s) sin verificar' ELSE n_ev || ' evidencia(s) verificadas' END),
    jsonb_build_object('key','effectiveness','label','Verificación de eficacia realizada','ok',n_act > 0 AND n_act_open = 0,
      'detail', CASE WHEN n_act = 0 THEN 'El caso no tiene acciones en el plan' WHEN n_act_open > 0 THEN n_act_open || ' acción(es) sin verificación de eficacia' ELSE 'Todas las acciones verificadas' END),
    jsonb_build_object('key','miper','label','MIPER revisada cuando corresponda','ok',n_hz > 0 OR (c.miper_not_applicable AND coalesce(trim(c.miper_na_reason),'') <> ''),
      'detail', CASE WHEN n_hz > 0 THEN n_hz || ' riesgo(s) MIPER vinculados al caso' WHEN c.miper_not_applicable AND coalesce(trim(c.miper_na_reason),'') <> '' THEN 'No aplica: ' || c.miper_na_reason ELSE 'Revisa la MIPER desde el caso o justifica por qué no aplica' END),
    jsonb_build_object('key','trainings','label','Capacitaciones obligatorias completadas','ok',n_tr = 0,
      'detail', CASE WHEN n_tr = 0 THEN 'Sin capacitaciones obligatorias pendientes' ELSE n_tr || ' capacitación(es) obligatoria(s) pendiente(s)' END),
    jsonb_build_object('key','final_report','label','Informe final completado','ok',c.final_report_completed_at IS NOT NULL,
      'detail', CASE WHEN c.final_report_completed_at IS NOT NULL THEN 'Informe final marcado como completado' ELSE 'Falta completar el informe final' END)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.case_closure_checklist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.case_closure_checklist(uuid) TO authenticated;

DROP TRIGGER IF EXISTS trg_cases_block_close_training ON public.cases;

CREATE OR REPLACE FUNCTION public.cases_closure_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pending text;
BEGIN
  IF NEW.status = 'cerrado' AND OLD.status IS DISTINCT FROM 'cerrado' THEN
    SELECT string_agg(e->>'label', ', ') INTO pending
      FROM jsonb_array_elements(public.case_closure_checklist(NEW.id)) e WHERE NOT (e->>'ok')::boolean;
    IF pending IS NOT NULL THEN
      RAISE EXCEPTION 'No se puede cerrar el caso. Requisitos pendientes: %', pending;
    END IF;
    IF coalesce(trim(NEW.closure_observation),'') = '' THEN
      RAISE EXCEPTION 'Debes registrar una observación de cierre';
    END IF;
    NEW.closed_by := auth.uid();
    NEW.closed_at := now();
    NEW.closure_result := coalesce(NEW.closure_result, 'Cerrado conforme');
  END IF;
  IF NEW.final_report_completed_at IS NOT NULL AND OLD.final_report_completed_at IS NULL THEN
    NEW.final_report_completed_at := now();
    NEW.final_report_completed_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_cases_closure_guard BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.cases_closure_guard();

CREATE OR REPLACE FUNCTION public.cases_log_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_events(case_id, event_type, description, data, actor_id)
    VALUES (NEW.id, 'created', 'Caso registrado', jsonb_build_object('status', NEW.status), auth.uid());
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'cerrado' THEN
      INSERT INTO public.case_events(case_id, event_type, description, data, actor_id)
      VALUES (NEW.id, 'closed', 'Caso cerrado: ' || coalesce(NEW.closure_result,''),
        jsonb_build_object('from', OLD.status, 'to', NEW.status, 'closed_at', NEW.closed_at,
          'observation', NEW.closure_observation, 'result', NEW.closure_result,
          'checklist', public.case_closure_checklist(NEW.id)), auth.uid());
    ELSE
      INSERT INTO public.case_events(case_id, event_type, description, data, actor_id)
      VALUES (NEW.id, 'status_change', 'Estado cambiado de ' || OLD.status || ' a ' || NEW.status,
        jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
  END IF;
  IF NEW.final_report_completed_at IS NOT NULL AND OLD.final_report_completed_at IS NULL THEN
    INSERT INTO public.case_events(case_id, event_type, description, actor_id)
    VALUES (NEW.id, 'final_report', 'Informe final completado', auth.uid());
  END IF;
  IF NEW.miper_not_applicable AND NOT OLD.miper_not_applicable THEN
    INSERT INTO public.case_events(case_id, event_type, description, data, actor_id)
    VALUES (NEW.id, 'miper_na', 'MIPER marcada como no aplicable', jsonb_build_object('reason', NEW.miper_na_reason), auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_cases_log_events AFTER INSERT OR UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.cases_log_events();

CREATE OR REPLACE FUNCTION public.evidences_log_verify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL THEN
    NEW.verified_at := now();
    NEW.verified_by := auth.uid();
    INSERT INTO public.case_events(case_id, event_type, description, data, actor_id)
    VALUES (NEW.case_id, 'evidence_verified', 'Evidencia verificada: ' || coalesce(NEW.file_name,''), jsonb_build_object('evidence_id', NEW.id), auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_evidences_log_verify BEFORE UPDATE ON public.case_evidences
  FOR EACH ROW EXECUTE FUNCTION public.evidences_log_verify();