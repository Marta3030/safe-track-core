import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InvestigationRow = Database["public"]["Tables"]["investigations"]["Row"];
export type InterviewRow =
  Database["public"]["Tables"]["investigation_interviews"]["Row"];

export function investigationQueryKey(caseId: string) {
  return ["investigation", caseId] as const;
}

export function interviewsQueryKey(investigationId: string | null) {
  return ["investigation-interviews", investigationId ?? "none"] as const;
}

export function useInvestigation(caseId: string) {
  return useQuery({
    queryKey: investigationQueryKey(caseId),
    queryFn: async (): Promise<InvestigationRow | null> => {
      const { data, error } = await supabase
        .from("investigations")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: Boolean(caseId),
  });
}

export function useInterviews(investigationId: string | null) {
  return useQuery({
    queryKey: interviewsQueryKey(investigationId),
    queryFn: async (): Promise<InterviewRow[]> => {
      const { data, error } = await supabase
        .from("investigation_interviews")
        .select("*")
        .eq("investigation_id", investigationId!)
        .order("interviewed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(investigationId),
  });
}
