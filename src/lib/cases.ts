import type { Database } from "@/integrations/supabase/types";

export type CaseType = Database["public"]["Enums"]["case_type"];
export type CaseSeverity = Database["public"]["Enums"]["case_severity"];
export type CaseStatus = Database["public"]["Enums"]["case_status"];
export type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

export const CASE_TYPES: CaseType[] = [
  "accidente",
  "incidente",
  "cuasi_accidente",
  "enfermedad_profesional",
  "condicion_insegura",
];

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  accidente: "Accidente",
  incidente: "Incidente",
  cuasi_accidente: "Cuasi accidente",
  enfermedad_profesional: "Enfermedad profesional",
  condicion_insegura: "Condición insegura",
};

export const CASE_SEVERITIES: CaseSeverity[] = ["leve", "moderada", "grave", "fatal"];

export const CASE_SEVERITY_LABELS: Record<CaseSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
  fatal: "Fatal",
};

export const CASE_STATUSES: CaseStatus[] = [
  "borrador",
  "reportado",
  "en_investigacion",
  "plan_accion",
  "verificacion",
  "cerrado",
  "anulado",
];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  borrador: "Borrador",
  reportado: "Reportado",
  en_investigacion: "En investigación",
  plan_accion: "Plan de acción",
  verificacion: "Verificación",
  cerrado: "Cerrado",
  anulado: "Anulado",
};

/** Flujo de estados permitido desde el módulo de casos. */
export const CASE_STATUS_FLOW: Record<CaseStatus, CaseStatus[]> = {
  borrador: ["reportado", "anulado"],
  reportado: ["en_investigacion", "anulado"],
  en_investigacion: ["plan_accion", "verificacion", "anulado"],
  plan_accion: ["verificacion", "anulado"],
  verificacion: ["cerrado", "en_investigacion"],
  cerrado: ["en_investigacion"],
  anulado: ["borrador"],
};

export const CASE_STATUS_TONE: Record<CaseStatus, string> = {
  borrador: "bg-muted text-muted-foreground",
  reportado: "bg-primary/15 text-primary",
  en_investigacion: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  plan_accion: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  verificacion: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  cerrado: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  anulado: "bg-destructive/15 text-destructive",
};

export const CASE_SEVERITY_TONE: Record<CaseSeverity, string> = {
  leve: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  moderada: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  grave: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  fatal: "bg-destructive/15 text-destructive",
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convierte un timestamp ISO al formato que espera <input type="datetime-local">. */
export function toLocalInput(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
