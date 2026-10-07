ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS parent_action_id uuid REFERENCES public.actions(id);
CREATE INDEX IF NOT EXISTS idx_actions_parent ON public.actions(parent_action_id);

CREATE TABLE public.action_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  action_implemented boolean NOT NULL,
  evidence_reviewed boolean NOT NULL,
  control_implemented boolean NOT NULL,
  risk_controlled boolean NOT NULL,
  result text NOT NULL CHECK (result IN ('eficaz','parcialmente_eficaz','no_eficaz')),
  observations text,
  verified_on date NOT NULL DEFAULT current_date,
  verifier_id uuid NOT NULL REFERENCES public.profiles(id),
  previous_status public.action_status,
  new_status public.action_status,
  follow_up_action_id uuid REFERENCES public.actions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_action_verifications_action ON public.action_verifications(action_id);
GRANT SELECT ON public.action_verifications TO authenticated;
GRANT ALL ON public.action_verifications TO service_role;
ALTER TABLE public.action_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read verifications" ON public.action_verifications
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.actions a JOIN public.action_plans p ON p.id = a.action_plan_id
  WHERE a.id = action_id AND p.organization_id = public.current_org_id()));

CREATE OR REPLACE FUNCTION public.verify_action(
  _action_id uuid, _action_implemented boolean, _evidence_reviewed boolean,
  _control_implemented boolean, _risk_controlled boolean, _result text,
  _observations text, _verified_on date,
  _new_description text DEFAULT NULL, _new_responsible uuid DEFAULT NULL, _new_due date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.actions%ROWTYPE; org uuid; nstatus public.action_status; new_id uuid; ver_id uuid;
BEGIN
  IF NOT public.is_hse_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Sólo prevención o administración puede verificar eficacia';
  END IF;
  SELECT * INTO a FROM public.actions WHERE id = _action_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acción no encontrada'; END IF;
  SELECT organization_id INTO org FROM public.action_plans WHERE id = a.action_plan_id;
  IF org IS DISTINCT FROM public.current_org_id() THEN RAISE EXCEPTION 'Sin acceso a esta acción'; END IF;
  IF a.status::text NOT IN ('en_verificacion','evidencia_cargada') THEN
    RAISE EXCEPTION 'La acción no está en verificación';
  END IF;
  IF _result NOT IN ('eficaz','parcialmente_eficaz','no_eficaz') THEN RAISE EXCEPTION 'Resultado inválido'; END IF;
  IF _result <> 'eficaz' AND coalesce(trim(_observations),'') = '' THEN
    RAISE EXCEPTION 'Las observaciones son obligatorias si la acción no es eficaz';
  END IF;

  IF _result = 'no_eficaz' AND coalesce(trim(_new_description),'') <> '' THEN
    INSERT INTO public.actions(action_plan_id, description, control_type, responsible_id, due_date, status, priority, cause_id, action_kind, created_by, parent_action_id)
    VALUES (a.action_plan_id, trim(_new_description), a.control_type, coalesce(_new_responsible, a.responsible_id),
      _new_due, 'pendiente', a.priority, a.cause_id, 'correctiva', auth.uid(), a.id)
    RETURNING id INTO new_id;
  END IF;

  nstatus := CASE
    WHEN _result = 'eficaz' THEN 'eficaz'
    WHEN _result = 'no_eficaz' AND new_id IS NOT NULL THEN 'cancelada'
    ELSE 'en_progreso' END::public.action_status;

  UPDATE public.actions SET status = nstatus,
    verification_notes = CASE _result WHEN 'eficaz' THEN 'Eficaz' WHEN 'parcialmente_eficaz' THEN 'Parcialmente eficaz' ELSE 'No eficaz' END
      || coalesce(': ' || nullif(trim(_observations),''), ''),
    verified_by = auth.uid(), verified_at = now(),
    evidence_path = CASE WHEN _result = 'eficaz' THEN evidence_path ELSE NULL END,
    evidence_name = CASE WHEN _result = 'eficaz' THEN evidence_name ELSE NULL END
  WHERE id = a.id;

  INSERT INTO public.action_verifications(action_id, action_implemented, evidence_reviewed, control_implemented,
    risk_controlled, result, observations, verified_on, verifier_id, previous_status, new_status, follow_up_action_id)
  VALUES (a.id, _action_implemented, _evidence_reviewed, _control_implemented, _risk_controlled, _result,
    nullif(trim(_observations),''), coalesce(_verified_on, current_date), auth.uid(), a.status, nstatus, new_id)
  RETURNING id INTO ver_id;
  RETURN ver_id;
END $$;
REVOKE ALL ON FUNCTION public.verify_action(uuid,boolean,boolean,boolean,boolean,text,text,date,text,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_action(uuid,boolean,boolean,boolean,boolean,text,text,date,text,uuid,date) TO authenticated;