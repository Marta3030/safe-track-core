import type { ActionStatus } from "@/lib/actions";
import type { CaseStatus, CaseType } from "@/lib/cases";

export type DashCase = {
  id: string;
  code: string | null;
  title: string;
  type: CaseType;
  status: CaseStatus;
  occurred_at: string;
  reported_at: string;
  created_at: string;
  closed_at: string | null;
  work_center_id: string | null;
  area_name: string | null;
  has_investigation: boolean;
  investigation_finished: boolean;
};

export type DashAction = {
  id: string;
  description: string;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  case_id: string | null;
};

export type DashCause = { case_id: string; label: string };

/** Statuses counted as fulfilled for compliance. */
export const DONE_STATUSES: ActionStatus[] = ["eficaz", "cerrada", "verificada", "completada"];
const ACCIDENT_TYPES: CaseType[] = ["accidente", "enfermedad_profesional"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function isOverdue(a: DashAction, today = new Date()): boolean {
  if (a.status === "vencida") return true;
  if (!a.due_date || DONE_STATUSES.includes(a.status) || a.status === "cancelada") return false;
  return a.due_date < today.toISOString().slice(0, 10);
}

/** % of non-cancelled actions that are fulfilled; null when there are none. */
export function compliance(actions: DashAction[]): number | null {
  const valid = actions.filter((a) => a.status !== "cancelada");
  if (!valid.length) return null;
  return Math.round((valid.filter((a) => DONE_STATUSES.includes(a.status)).length / valid.length) * 100);
}

/** Average days between case creation and closure; null when no closed cases. */
export function avgCloseDays(cases: DashCase[]): number | null {
  const closed = cases.filter((c) => c.status === "cerrado" && c.closed_at);
  if (!closed.length) return null;
  const total = closed.reduce(
    (s, c) => s + (new Date(c.closed_at!).getTime() - new Date(c.created_at).getTime()) / 86_400_000,
    0,
  );
  return Math.round((total / closed.length) * 10) / 10;
}

function monthKeys(months: number, today: Date) {
  const out: { key: string; label: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return out;
}

export function computeDashboard(
  cases: DashCase[],
  actions: DashAction[],
  causes: DashCause[],
  months: number,
  today = new Date(),
) {
  const keys = monthKeys(months, today);
  const firstKey = keys[0]?.key ?? "";
  const inPeriod = cases.filter((c) => c.occurred_at.slice(0, 7) >= firstKey);
  const caseIds = new Set(cases.map((c) => c.id));
  const scopedActions = actions.filter((a) => !a.case_id || caseIds.has(a.case_id));

  const open = (c: DashCase) => c.status !== "cerrado" && c.status !== "anulado";
  const kpis = {
    openAccidents: cases.filter((c) => open(c) && c.status !== "borrador").length,
    pendingInvestigations: cases.filter(
      (c) => open(c) && c.status !== "borrador" && !c.investigation_finished,
    ).length,
    openActions: scopedActions.filter(
      (a) => !DONE_STATUSES.includes(a.status) && a.status !== "cancelada",
    ).length,
    overdueActions: scopedActions.filter((a) => isOverdue(a, today)).length,
    compliance: compliance(scopedActions),
    closedCases: inPeriod.filter((c) => c.status === "cerrado").length,
    avgCloseDays: avgCloseDays(inPeriod),
  };

  const byMonth = keys.map(({ key, label }) => {
    const m = inPeriod.filter((c) => c.occurred_at.slice(0, 7) === key);
    return {
      mes: label,
      accidentes: m.filter((c) => ACCIDENT_TYPES.includes(c.type)).length,
      otros: m.filter((c) => !ACCIDENT_TYPES.includes(c.type)).length,
    };
  });

  const count = <T,>(items: T[], f: (x: T) => string) => {
    const map = new Map<string, number>();
    items.forEach((x) => map.set(f(x), (map.get(f(x)) ?? 0) + 1));
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  };

  const periodIds = new Set(inPeriod.map((c) => c.id));
  const trend = keys.map(({ key, label }) => {
    const due = scopedActions.filter((a) => a.due_date?.slice(0, 7) === key && a.status !== "cancelada");
    return {
      mes: label,
      cumplimiento: due.length
        ? Math.round((due.filter((a) => DONE_STATUSES.includes(a.status)).length / due.length) * 100)
        : null,
    };
  });

  return {
    kpis,
    byMonth,
    byArea: count(inPeriod, (c) => c.area_name ?? "Sin área").slice(0, 8),
    byType: count(inPeriod, (c) => c.type),
    topCauses: count(causes.filter((c) => periodIds.has(c.case_id)), (c) => c.label).slice(0, 6),
    byStatus: count(scopedActions, (a) => a.status),
    trend,
  };
}
