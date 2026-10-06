import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ActionRow = Database["public"]["Tables"]["actions"]["Row"] & {
  action_plans: {
    id: string;
    case_id: string | null;
    organization_id: string;
    cases: { id: string; code: string | null; title: string } | null;
  } | null;
  responsible: { id: string; full_name: string | null } | null;
  investigation_causes: { id: string; description: string; cause_type: string } | null;
};

const SELECT =
  "*, action_plans!inner(id, case_id, organization_id, cases(id, code, title)), responsible:profiles!actions_responsible_id_fkey(id, full_name), investigation_causes(id, description, cause_type)";

export function useActions(caseId?: string) {
  return useQuery({
    queryKey: ["actions", caseId ?? "all"],
    queryFn: async (): Promise<ActionRow[]> => {
      await supabase.rpc("refresh_overdue_actions");
      let q = supabase.from("actions").select(SELECT).order("due_date", { ascending: true, nullsFirst: false });
      if (caseId) q = q.eq("action_plans.case_id", caseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ActionRow[];
    },
  });
}

export function useOrgPeople() {
  return useQuery({
    queryKey: ["org-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCaseCauses(caseId: string | null) {
  return useQuery({
    queryKey: ["case-causes", caseId],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigation_causes")
        .select("id, description, cause_type, investigations!inner(case_id)")
        .eq("investigations.case_id", caseId!);
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, description: c.description, cause_type: c.cause_type }));
    },
  });
}
