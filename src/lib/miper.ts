import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RiskLevel = Database["public"]["Enums"]["risk_level"];
export type MatrixLevel = { level: RiskLevel; label: string; min: number; max: number };
export type RiskMatrix = Omit<Database["public"]["Tables"]["risk_matrices"]["Row"], "probability_labels" | "consequence_labels" | "levels"> & {
  probability_labels: string[];
  consequence_labels: string[];
  levels: MatrixLevel[];
};
export type HazardRow = Database["public"]["Tables"]["hazards"]["Row"] & {
  owner: { id: string; full_name: string | null } | null;
  cases: { id: string; code: string | null; title: string } | null;
};

export const RISK_LEVELS: RiskLevel[] = ["bajo", "medio", "alto", "critico"];
export const LEVEL_TONE: Record<RiskLevel, string> = {
  bajo: "bg-success/20 text-success",
  medio: "bg-warning/25 text-warning-foreground",
  alto: "bg-primary/30 text-foreground",
  critico: "bg-destructive/20 text-destructive",
};

/** Clasifica un puntaje según los niveles configurados en la matriz (sin umbrales fijos). */
export function classify(matrix: RiskMatrix | undefined, p: number | null, c: number | null) {
  if (!matrix || !p || !c) return null;
  const score = p * c;
  const lvl = matrix.levels.find((l) => score >= l.min && score <= l.max);
  return lvl ? { ...lvl, score } : null;
}

export function useMatrices() {
  return useQuery({
    queryKey: ["risk-matrices"],
    queryFn: async (): Promise<RiskMatrix[]> => {
      const { data, error } = await supabase.from("risk_matrices").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as RiskMatrix[];
    },
  });
}

export function useHazards(caseId?: string) {
  return useQuery({
    queryKey: ["hazards", caseId ?? "all"],
    queryFn: async (): Promise<HazardRow[]> => {
      let q = supabase
        .from("hazards")
        .select("*, owner:profiles!hazards_owner_id_fkey(id, full_name), cases(id, code, title)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (caseId) q = q.eq("source_case_id", caseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HazardRow[];
    },
  });
}

export function useHazardReviews(hazardId: string | null) {
  return useQuery({
    queryKey: ["hazard-reviews", hazardId],
    enabled: Boolean(hazardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hazard_reviews")
        .select("*")
        .eq("hazard_id", hazardId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
