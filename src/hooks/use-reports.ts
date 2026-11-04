import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashAction } from "@/lib/dashboard";
import type { ReportCase, ReportCause, ReportVerification } from "@/lib/reports";

/** Signed-in client: RLS limits every row to the user's organization and role. */
export function useReportData() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [cases, actions, causes, vers, orgs, centers, areas] = await Promise.all([
        supabase
          .from("cases")
          .select("id, code, title, type, status, severity, occurred_at, reported_at, created_at, closed_at, organization_id, work_center_id, area_id, areas(name), investigations(id, finished_at)")
          .is("deleted_at", null),
        supabase.from("actions").select("id, description, status, due_date, completed_at, action_plans(case_id)"),
        supabase.from("investigation_causes").select("cause_type, category, description, investigations(case_id)"),
        supabase.from("action_verifications").select("action_id, result"),
        supabase.from("organizations").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("work_centers").select("id, name, organization_id").is("deleted_at", null).order("name"),
        supabase.from("areas").select("id, name, work_center_id").is("deleted_at", null).order("name"),
      ]);
      for (const r of [cases, actions, causes, vers, orgs, centers, areas]) if (r.error) throw r.error;
      const rc: ReportCase[] = (cases.data ?? []).map((c: any) => {
        const inv = Array.isArray(c.investigations) ? c.investigations[0] : c.investigations;
        return {
          ...c,
          area_name: c.areas?.name ?? null,
          has_investigation: !!inv,
          investigation_finished: !!inv?.finished_at,
        };
      });
      const ra: DashAction[] = (actions.data ?? []).map((a: any) => ({
        id: a.id, description: a.description, status: a.status, due_date: a.due_date,
        completed_at: a.completed_at, case_id: a.action_plans?.case_id ?? null,
      }));
      const rcs: ReportCause[] = (causes.data ?? [])
        .filter((c: any) => c.investigations?.case_id)
        .map((c: any) => ({
          case_id: c.investigations.case_id,
          cause_type: c.cause_type,
          label: (c.category?.trim() || c.description || "Sin descripción").slice(0, 80),
        }));
      return {
        cases: rc,
        actions: ra,
        causes: rcs,
        verifications: (vers.data ?? []) as ReportVerification[],
        orgs: orgs.data ?? [],
        centers: centers.data ?? [],
        areas: areas.data ?? [],
      };
    },
  });
}
