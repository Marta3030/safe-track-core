ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'evidencia_cargada';
ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'en_verificacion';
ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'eficaz';
ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'cerrada';

ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS action_kind text NOT NULL DEFAULT 'correctiva'
  CHECK (action_kind IN ('inmediata','correctiva','preventiva'));
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS evidence_name text;
CREATE INDEX IF NOT EXISTS idx_actions_status ON public.actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_due ON public.actions(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_plan ON public.actions(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_actions_responsible ON public.actions(responsible_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_case ON public.action_plans(case_id);

CREATE OR REPLACE FUNCTION public.actions_status_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Cargar evidencia nunca cierra: pasa a verificación
  IF NEW.evidence_path IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.evidence_path IS DISTINCT FROM OLD.evidence_path)
     AND NEW.status::text IN ('pendiente','en_progreso','vencida','evidencia_cargada') THEN
    NEW.status := 'en_verificacion'::public.action_status;
  END IF;
  -- Sólo prevención/administración valida eficacia o cierra
  IF NEW.status::text IN ('eficaz','cerrada')
     AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.is_hse_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Sólo prevención o administración puede validar o cerrar acciones';
  END IF;
  IF NEW.status::text = 'eficaz' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.verified_by := auth.uid(); NEW.verified_at := now();
  END IF;
  IF NEW.status::text IN ('eficaz','cerrada') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  -- Vencimiento automático
  IF NEW.due_date IS NOT NULL AND NEW.due_date < current_date
     AND NEW.status::text IN ('pendiente','en_progreso') THEN
    NEW.status := 'vencida'::public.action_status;
  ELSIF NEW.status::text = 'vencida' AND (NEW.due_date IS NULL OR NEW.due_date >= current_date) THEN
    NEW.status := 'pendiente'::public.action_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_actions_status_rules ON public.actions;
CREATE TRIGGER trg_actions_status_rules BEFORE INSERT OR UPDATE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.actions_status_rules();

CREATE OR REPLACE FUNCTION public.refresh_overdue_actions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  UPDATE public.actions a SET status = 'vencida'::public.action_status
  FROM public.action_plans p
  WHERE a.action_plan_id = p.id AND p.organization_id = public.current_org_id()
    AND a.due_date < current_date AND a.status::text IN ('pendiente','en_progreso');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_overdue_actions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_overdue_actions() TO authenticated;

-- Aislar lectura por organización
DROP POLICY IF EXISTS action_plans_select ON public.action_plans;
CREATE POLICY action_plans_select ON public.action_plans FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
DROP POLICY IF EXISTS actions_select ON public.actions;
CREATE POLICY actions_select ON public.actions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.action_plans p WHERE p.id = action_plan_id AND p.organization_id = public.current_org_id()));