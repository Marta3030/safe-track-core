-- Departamentos
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_center_id uuid NOT NULL REFERENCES public.work_centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_departments_center ON public.departments(work_center_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_areas_department ON public.areas(department_id);
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.center_in_my_org(_center uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.work_centers w WHERE w.id = _center AND w.organization_id = public.current_org_id());
$$;
REVOKE EXECUTE ON FUNCTION public.center_in_my_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.center_in_my_org(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_hse_writer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'prevencionista');
$$;
REVOKE EXECUTE ON FUNCTION public.is_hse_writer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_hse_writer() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_in_my_org(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user AND p.organization_id = public.current_org_id());
$$;
REVOKE EXECUTE ON FUNCTION public.user_in_my_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_in_my_org(uuid) TO authenticated, service_role;

CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated
  USING (public.center_in_my_org(work_center_id));
CREATE POLICY departments_manage ON public.departments FOR ALL TO authenticated
  USING (public.is_hse_writer() AND public.center_in_my_org(work_center_id))
  WITH CHECK (public.is_hse_writer() AND public.center_in_my_org(work_center_id));

-- Aislamiento multiempresa de la estructura
DROP POLICY IF EXISTS "organizations_select_auth" ON public.organizations;
DROP POLICY IF EXISTS "organizations_manage" ON public.organizations;
CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id());
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (id = public.current_org_id() AND public.has_role(auth.uid(), 'administrador'));

DROP POLICY IF EXISTS "work_centers_select_auth" ON public.work_centers;
DROP POLICY IF EXISTS "work_centers_manage" ON public.work_centers;
CREATE POLICY work_centers_select ON public.work_centers FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY work_centers_manage ON public.work_centers FOR ALL TO authenticated
  USING (public.is_hse_writer() AND organization_id = public.current_org_id())
  WITH CHECK (public.is_hse_writer() AND organization_id = public.current_org_id());

DROP POLICY IF EXISTS "areas_select_auth" ON public.areas;
DROP POLICY IF EXISTS "areas_manage" ON public.areas;
CREATE POLICY areas_select ON public.areas FOR SELECT TO authenticated
  USING (public.center_in_my_org(work_center_id));
CREATE POLICY areas_manage ON public.areas FOR ALL TO authenticated
  USING (public.is_hse_writer() AND public.center_in_my_org(work_center_id))
  WITH CHECK (public.is_hse_writer() AND public.center_in_my_org(work_center_id));

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = public.current_org_id());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (public.has_role(auth.uid(), 'administrador') AND organization_id = public.current_org_id()))
  WITH CHECK (id = auth.uid() OR (public.has_role(auth.uid(), 'administrador') AND organization_id = public.current_org_id()));

-- Evita que un usuario cambie su propia empresa o se active a sí mismo
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'administrador') THEN
    NEW.organization_id := OLD.organization_id;
    NEW.is_active := OLD.is_active;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'administrador') AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    NEW.organization_id := OLD.organization_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.profiles_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_profiles_guard ON public.profiles;
CREATE TRIGGER trg_profiles_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_in_my_org(user_id));
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador') AND public.user_in_my_org(user_id) AND user_id <> auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'administrador') AND public.user_in_my_org(user_id) AND user_id <> auth.uid());

-- Registro de auditoría
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  summary text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org_date ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_log(entity, action);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON public.audit_log FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id()
    AND (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'prevencionista')));

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb; o jsonb; act text; org uuid; label text; summ text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN o := to_jsonb(OLD); END IF;
  label := COALESCE(r->>'code', r->>'title', r->>'name', r->>'description', r->>'hazard', r->>'file_name', r->>'role', r->>'full_name', '');
  label := left(label, 120);

  IF TG_OP = 'INSERT' THEN
    act := CASE TG_TABLE_NAME WHEN 'case_evidences' THEN 'evidencia' WHEN 'action_verifications' THEN 'verificacion' ELSE 'creacion' END;
  ELSIF TG_OP = 'DELETE' THEN
    act := 'eliminacion';
  ELSIF (o->>'deleted_at') IS NULL AND (r->>'deleted_at') IS NOT NULL THEN
    act := 'baja';
  ELSIF TG_TABLE_NAME = 'cases' AND r->>'status' = 'cerrado' AND o->>'status' IS DISTINCT FROM 'cerrado' THEN
    act := 'cierre';
  ELSIF r ? 'status' AND (o->>'status') IS DISTINCT FROM (r->>'status') THEN
    act := 'cambio_estado';
  ELSE
    IF (r - 'updated_at') = (o - 'updated_at') THEN RETURN NULL; END IF;
    act := 'edicion';
  END IF;

  org := COALESCE(NULLIF(r->>'organization_id','')::uuid, public.current_org_id());
  IF org IS NULL AND TG_TABLE_NAME = 'cases' THEN org := (r->>'organization_id')::uuid; END IF;

  summ := CASE act
    WHEN 'cambio_estado' THEN format('%s: estado %s → %s', label, o->>'status', r->>'status')
    WHEN 'verificacion' THEN format('Verificación de eficacia: %s', r->>'result')
    WHEN 'evidencia' THEN format('Evidencia cargada: %s', label)
    ELSE label END;

  INSERT INTO public.audit_log(organization_id, actor_id, entity, record_id, action, summary, data)
  VALUES (org, auth.uid(), TG_TABLE_NAME, NULLIF(r->>'id','')::uuid, act, summ,
    CASE WHEN act IN ('cambio_estado','cierre') THEN jsonb_build_object('from', o->>'status', 'to', r->>'status') ELSE NULL END);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cases','case_evidences','investigations','investigation_causes','action_plans','actions','action_verifications','hazards','trainings','organizations','work_centers','areas','departments','user_roles','profiles']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t);
  END LOOP;
END $$;

-- Notificaciones
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read_at, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_delete ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_actions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid; cid uuid; lnk text;
BEGIN
  SELECT ap.organization_id, ap.case_id INTO org, cid FROM public.action_plans ap WHERE ap.id = NEW.action_plan_id;
  lnk := CASE WHEN cid IS NULL THEN '/planes-accion' ELSE '/casos/' || cid END;
  IF NEW.responsible_id IS NOT NULL AND NEW.responsible_id IS DISTINCT FROM auth.uid()
     AND (TG_OP = 'INSERT' OR NEW.responsible_id IS DISTINCT FROM OLD.responsible_id) THEN
    INSERT INTO public.notifications(user_id, organization_id, kind, title, body, link)
    VALUES (NEW.responsible_id, org, 'accion_asignada', 'Se te asignó una acción', left(NEW.description, 200), lnk);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'en_verificacion' AND OLD.status IS DISTINCT FROM 'en_verificacion' THEN
    INSERT INTO public.notifications(user_id, organization_id, kind, title, body, link)
    SELECT DISTINCT p.id, org, 'verificacion_pendiente', 'Acción lista para verificar eficacia', left(NEW.description, 200), lnk
    FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.organization_id = org AND p.is_active AND ur.role IN ('administrador','prevencionista') AND p.id IS DISTINCT FROM auth.uid();
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'vencida' AND OLD.status IS DISTINCT FROM 'vencida' AND NEW.responsible_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, organization_id, kind, title, body, link)
    VALUES (NEW.responsible_id, org, 'accion_vencida', 'Acción vencida', left(NEW.description, 200), lnk);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_actions() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_actions AFTER INSERT OR UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.notify_actions();

CREATE OR REPLACE FUNCTION public.notify_cases()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status <> 'borrador') OR (TG_OP = 'UPDATE' AND OLD.status = 'borrador' AND NEW.status = 'reportado') THEN
    INSERT INTO public.notifications(user_id, organization_id, kind, title, body, link)
    SELECT DISTINCT p.id, NEW.organization_id, 'caso_reportado', 'Nuevo caso reportado', left(COALESCE(NEW.code || ' · ', '') || NEW.title, 200), '/casos/' || NEW.id
    FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.organization_id = NEW.organization_id AND p.is_active AND ur.role IN ('administrador','prevencionista') AND p.id IS DISTINCT FROM auth.uid();
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cerrado' AND OLD.status IS DISTINCT FROM 'cerrado' AND NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications(user_id, organization_id, kind, title, body, link)
    VALUES (NEW.created_by, NEW.organization_id, 'caso_cerrado', 'Caso cerrado', left(COALESCE(NEW.code || ' · ', '') || NEW.title, 200), '/casos/' || NEW.id);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.notify_cases() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_cases AFTER INSERT OR UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.notify_cases();