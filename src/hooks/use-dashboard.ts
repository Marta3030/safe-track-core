import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashAction, DashCase, DashCause } from "@/lib/dashboard";

const CAUSE_TYPE_LABEL: Record<string, string> = {
  inmediata: "Causa inmediata",
  basica: "Causa básica",
  raiz: "Causa raíz",
  organizacional: "Causa organizacional",
};

/** All reads go through the signed-in client, so RLS limits rows to the user's organization and role. */
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [cases, actions, causes, trainings, hazards, centers] = await Promise.all([
        supabase
          .from("cases")
          .select(
            "id, code, title, type, status, occurred_at, reported_at, created_at, closed_at, work_center_id, areas(name), investigations(id, finished_at, root_cause_confirmed_at)",
          )
          .is("deleted_at", null),
        supabase
          .from("actions")
          .select("id, description, status, due_date, completed_at, action_plans(case_id)"),
        supabase
          .from("investigation_causes")
          .select("cause_type, category, investigations(case_id)"),
        supabase
          .from("trainings")
          .select("id, title, status, is_mandatory, scheduled_at, source_case_id")
          .is("deleted_at", null)
          .eq("is_mandatory", true)
          .in("status", ["planificada", "en_curso"]),
        supabase
          .from("hazards")
          .select("id, hazard, risk_level, next_review_at")
          .is("deleted_at", null),
        supabase.from("work_centers").select("id, name").is("deleted_at", null).order("name"),
      ]);
      for (const r of [cases, actions, causes, trainings, hazards, centers]) if (r.error) throw r.error;

      const dashCases: DashCase[] = (cases.data ?? []).map((c: any) => {
        const inv = Array.isArray(c.investigations) ? c.investigations[0] : c.investigations;
        return {
          id: c.id,
          code: c.code,
          title: c.title,
          type: c.type,
          status: c.status,
          occurred_at: c.occurred_at,
          reported_at: c.reported_at,
          created_at: c.created_at,
          closed_at: c.closed_at,
          work_center_id: c.work_center_id,
          area_name: c.areas?.name ?? null,
          has_investigation: !!inv,
          investigation_finished: !!inv?.finished_at,
        };
      });
      const dashActions: DashAction[] = (actions.data ?? []).map((a: any) => ({
        id: a.id,
        description: a.description,
        status: a.status,
        due_date: a.due_date,
        completed_at: a.completed_at,
        case_id: a.action_plans?.case_id ?? null,
      }));
      const dashCauses: DashCause[] = (causes.data ?? [])
        .filter((c: any) => c.investigations?.case_id)
        .map((c: any) => ({
          case_id: c.investigations.case_id,
          label: c.category?.trim() || CAUSE_TYPE_LABEL[c.cause_type] || c.cause_type,
        }));
      return {
        cases: dashCases,
        actions: dashActions,
        causes: dashCauses,
        pendingTrainings: trainings.data ?? [],
        hazards: hazards.data ?? [],
        centers: centers.data ?? [],
      };
    },
  });
}
