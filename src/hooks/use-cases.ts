import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CaseRow } from "@/lib/cases";

export type CaseListRow = CaseRow & {
  work_centers: { id: string; name: string } | null;
  areas: { id: string; name: string } | null;
};

const LIST_SELECT =
  "*, work_centers(id, name), areas(id, name)";

export function casesQueryKey() {
  return ["cases"] as const;
}

export function useCases() {
  return useQuery({
    queryKey: casesQueryKey(),
    queryFn: async (): Promise<CaseListRow[]> => {
      const { data, error } = await supabase
        .from("cases")
        .select(LIST_SELECT)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CaseListRow[];
    },
  });
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: ["cases", caseId],
    queryFn: async (): Promise<CaseListRow | null> => {
      const { data, error } = await supabase
        .from("cases")
        .select(LIST_SELECT)
        .eq("id", caseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CaseListRow | null;
    },
    enabled: Boolean(caseId),
  });
}

export type OrgOption = { id: string; name: string };
export type CenterOption = { id: string; name: string; organization_id: string };
export type AreaOption = { id: string; name: string; work_center_id: string };

export function useCatalogs() {
  return useQuery({
    queryKey: ["case-catalogs"],
    queryFn: async () => {
      const [orgs, centers, areas] = await Promise.all([
        supabase.from("organizations").select("id, name").is("deleted_at", null).order("name"),
        supabase
          .from("work_centers")
          .select("id, name, organization_id")
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("areas")
          .select("id, name, work_center_id")
          .is("deleted_at", null)
          .order("name"),
      ]);
      if (orgs.error) throw orgs.error;
      if (centers.error) throw centers.error;
      if (areas.error) throw areas.error;
      return {
        organizations: (orgs.data ?? []) as OrgOption[],
        workCenters: (centers.data ?? []) as CenterOption[],
        areas: (areas.data ?? []) as AreaOption[],
      };
    },
  });
}
