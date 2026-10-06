import type { Database } from "@/integrations/supabase/types";

export type ActionStatus = Database["public"]["Enums"]["action_status"];
export type Priority = Database["public"]["Enums"]["priority_level"];
export type ControlType = Database["public"]["Enums"]["control_type"];
export type ActionKind = "inmediata" | "correctiva" | "preventiva";

/** Estados visibles del flujo (completada/verificada/cancelada son heredados). */
export const ACTION_STATUSES: ActionStatus[] = [
  "pendiente",
  "en_progreso",
  "evidencia_cargada",
  "en_verificacion",
  "eficaz",
  "cerrada",
  "vencida",
];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En proceso",
  evidencia_cargada: "Evidencia cargada",
  en_verificacion: "En verificación",
  eficaz: "Eficaz",
  cerrada: "Cerrada",
  vencida: "Vencida",
  completada: "Completada",
  verificada: "Verificada",
  cancelada: "Cancelada",
};

export const ACTION_STATUS_TONE: Record<ActionStatus, string> = {
  pendiente: "bg-muted text-muted-foreground",
  en_progreso: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  evidencia_cargada: "bg-primary/15 text-primary",
  en_verificacion: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  eficaz: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cerrada: "bg-emerald-700/15 text-emerald-700 dark:text-emerald-300",
  vencida: "bg-destructive/15 text-destructive",
  completada: "bg-muted text-muted-foreground",
  verificada: "bg-muted text-muted-foreground",
  cancelada: "bg-muted text-muted-foreground",
};

export const PRIORITIES: Priority[] = ["baja", "media", "alta", "critica"];
export const PRIORITY_LABELS: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const ACTION_KINDS: ActionKind[] = ["inmediata", "correctiva", "preventiva"];
export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
  inmediata: "Inmediata",
  correctiva: "Correctiva",
  preventiva: "Preventiva",
};

export const CONTROL_TYPES: ControlType[] = [
  "eliminacion",
  "sustitucion",
  "ingenieria",
  "administrativo",
  "epp",
];
export const CONTROL_LABELS: Record<ControlType, string> = {
  eliminacion: "Eliminación",
  sustitucion: "Sustitución",
  ingenieria: "Ingeniería",
  administrativo: "Administrativo",
  epp: "EPP",
};

export const OPEN_STATUSES: ActionStatus[] = [
  "pendiente",
  "en_progreso",
  "evidencia_cargada",
  "en_verificacion",
  "vencida",
];

/** Días hasta la fecha compromiso (negativo = atrasada). */
export function daysUntil(due: string | null): number | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Estado efectivo: refleja vencimiento aunque el backend aún no lo haya recalculado. */
export function effectiveStatus(status: ActionStatus, due: string | null): ActionStatus {
  const d = daysUntil(due);
  if (d !== null && d < 0 && (status === "pendiente" || status === "en_progreso")) return "vencida";
  return status;
}

export function dueLabel(status: ActionStatus, due: string | null): string {
  if (!OPEN_STATUSES.includes(status)) return "";
  const d = daysUntil(due);
  if (d === null) return "Sin fecha";
  if (d < 0) return `Atrasada ${-d} d`;
  if (d === 0) return "Vence hoy";
  return `Vence en ${d} d`;
}
