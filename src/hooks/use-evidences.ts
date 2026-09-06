import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EvidenceRow = Database["public"]["Tables"]["case_evidences"]["Row"];

export function evidencesQueryKey(caseId: string) {
  return ["case-evidences", caseId] as const;
}

export function useEvidences(caseId: string) {
  return useQuery({
    queryKey: evidencesQueryKey(caseId),
    queryFn: async (): Promise<EvidenceRow[]> => {
      const { data, error } = await supabase
        .from("case_evidences")
        .select("*")
        .eq("case_id", caseId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvidenceRow[];
    },
    enabled: Boolean(caseId),
  });
}
