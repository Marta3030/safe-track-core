CREATE TABLE public.risk_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  description text,
  probability_labels jsonb NOT NULL,
  consequence_labels jsonb NOT NULL,
  levels jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_risk_matrices_org ON public.risk_matrices(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_matrices TO authenticated;
GRANT ALL ON public.risk_matrices TO service_role;
ALTER TABLE public.risk_matrices ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_matrices_select ON public.risk_matrices FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY risk_matrices_write ON public.risk_matrices FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()));
CREATE TRIGGER trg_risk_matrices_updated BEFORE UPDATE ON public.risk_matrices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.hazards
  ADD COLUMN matrix_id uuid REFERENCES public.risk_matrices(id),
  ADD COLUMN task text,
  ADD COLUMN post_probability integer,
  ADD COLUMN post_consequence integer,
  ADD COLUMN post_risk_level public.risk_level,
  ADD COLUMN risk_level_label text,
  ADD COLUMN post_risk_level_label text,
  ADD COLUMN residual_risk_level_label text,
  ADD COLUMN review_reason text;
CREATE INDEX IF NOT EXISTS idx_hazards_case_src ON public.hazards(source_case_id);

ALTER TABLE public.hazards DROP CONSTRAINT IF EXISTS hazards_probability_check;
ALTER TABLE public.hazards DROP CONSTRAINT IF EXISTS hazards_consequence_check;
ALTER TABLE public.hazards DROP CONSTRAINT IF EXISTS hazards_residual_probability_check;
ALTER TABLE public.hazards DROP CONSTRAINT IF EXISTS hazards_residual_consequence_check;

CREATE OR REPLACE FUNCTION public.matrix_level(_levels jsonb, _score int, OUT lvl public.risk_level, OUT lbl text)
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE e jsonb;
BEGIN
  IF _levels IS NOT NULL THEN
    FOR e IN SELECT * FROM jsonb_array_elements(_levels) LOOP
      IF _score >= (e->>'min')::int AND _score <= (e->>'max')::int THEN
        lvl := (e->>'level')::public.risk_level; lbl := e->>'label'; RETURN;
      END IF;
    END LOOP;
  END IF;
  lvl := CASE WHEN _score >= 15 THEN 'critico' WHEN _score >= 9 THEN 'alto' WHEN _score >= 4 THEN 'medio' ELSE 'bajo' END::public.risk_level;
  lbl := initcap(lvl::text);
END $$;

CREATE OR REPLACE FUNCTION public.set_hazard_risk_level()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE m public.risk_matrices%ROWTYPE; np int := 5; nc int := 5; r record;
BEGIN
  IF NEW.matrix_id IS NOT NULL THEN
    SELECT * INTO m FROM public.risk_matrices WHERE id = NEW.matrix_id;
    np := jsonb_array_length(m.probability_labels); nc := jsonb_array_length(m.consequence_labels);
  END IF;
  IF NEW.probability NOT BETWEEN 1 AND np OR NEW.consequence NOT BETWEEN 1 AND nc
     OR coalesce(NEW.post_probability,1) NOT BETWEEN 1 AND np OR coalesce(NEW.post_consequence,1) NOT BETWEEN 1 AND nc
     OR coalesce(NEW.residual_probability,1) NOT BETWEEN 1 AND np OR coalesce(NEW.residual_consequence,1) NOT BETWEEN 1 AND nc THEN
    RAISE EXCEPTION 'Valores fuera del rango de la matriz (%x%)', np, nc;
  END IF;
  SELECT * INTO r FROM public.matrix_level(m.levels, NEW.probability * NEW.consequence);
  NEW.risk_level := r.lvl; NEW.risk_level_label := r.lbl;
  IF NEW.post_probability IS NOT NULL AND NEW.post_consequence IS NOT NULL THEN
    SELECT * INTO r FROM public.matrix_level(m.levels, NEW.post_probability * NEW.post_consequence);
    NEW.post_risk_level := r.lvl; NEW.post_risk_level_label := r.lbl;
  ELSE NEW.post_risk_level := NULL; NEW.post_risk_level_label := NULL; END IF;
  IF NEW.residual_probability IS NOT NULL AND NEW.residual_consequence IS NOT NULL THEN
    SELECT * INTO r FROM public.matrix_level(m.levels, NEW.residual_probability * NEW.residual_consequence);
    NEW.residual_risk_level := r.lvl; NEW.residual_risk_level_label := r.lbl;
  ELSE NEW.residual_risk_level := NULL; NEW.residual_risk_level_label := NULL; END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.hazard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id uuid NOT NULL REFERENCES public.hazards(id) ON DELETE CASCADE,
  operation text NOT NULL,
  reason text,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hazard_reviews_hazard ON public.hazard_reviews(hazard_id);
GRANT SELECT ON public.hazard_reviews TO authenticated;
GRANT ALL ON public.hazard_reviews TO service_role;
ALTER TABLE public.hazard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY hazard_reviews_select ON public.hazard_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hazards h WHERE h.id = hazard_id AND h.organization_id = public.current_org_id()));

CREATE OR REPLACE FUNCTION public.log_hazard_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.hazard_reviews(hazard_id, operation, reason, old_data, new_data, changed_by)
  VALUES (NEW.id, TG_OP, NEW.review_reason,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) - 'review_reason' END, to_jsonb(NEW) - 'review_reason', auth.uid());
  RETURN NEW;
END $$;
CREATE TRIGGER trg_hazards_review AFTER INSERT OR UPDATE ON public.hazards FOR EACH ROW EXECUTE FUNCTION public.log_hazard_review();

DROP POLICY IF EXISTS hazards_select ON public.hazards;
DROP POLICY IF EXISTS hazards_write ON public.hazards;
CREATE POLICY hazards_select ON public.hazards FOR SELECT TO authenticated USING (organization_id = public.current_org_id());
CREATE POLICY hazards_write ON public.hazards FOR ALL TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()))
  WITH CHECK (organization_id = public.current_org_id() AND public.is_hse_manager(auth.uid()));