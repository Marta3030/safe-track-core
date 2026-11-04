import type { ActionStatus } from "@/lib/actions";
import type { CaseStatus, CaseType } from "@/lib/cases";
import { DONE_STATUSES, avgCloseDays, compliance, isOverdue, type DashAction, type DashCase } from "@/lib/dashboard";

export type ReportCase = DashCase & {
  organization_id: string;
  area_id: string | null;
  severity: string | null;
};
export type ReportCause = { case_id: string; cause_type: string; label: string };
export type ReportVerification = { action_id: string; result: string };

export type ReportFilters = {
  org: string;
  center: string;
  area: string;
  from: string; // YYYY-MM-DD or ""
  to: string;
  type: string;
  status: string;
};

export const EMPTY_FILTERS: ReportFilters = { org: "", center: "", area: "", from: "", to: "", type: "", status: "" };

export function filterCases(cases: ReportCase[], f: ReportFilters): ReportCase[] {
  return cases.filter((c) => {
    const day = c.occurred_at.slice(0, 10);
    return (
      (!f.org || c.organization_id === f.org) &&
      (!f.center || c.work_center_id === f.center) &&
      (!f.area || c.area_id === f.area) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (!f.type || c.type === (f.type as CaseType)) &&
      (!f.status || c.status === (f.status as CaseStatus))
    );
  });
}

const count = <T,>(items: T[], key: (x: T) => string) => {
  const m = new Map<string, number>();
  items.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
};

export function buildReport(
  cases: ReportCase[],
  actions: DashAction[],
  causes: ReportCause[],
  verifications: ReportVerification[],
  today = new Date(),
) {
  const ids = new Set(cases.map((c) => c.id));
  const acts = actions.filter((a) => a.case_id && ids.has(a.case_id));
  const actIds = new Set(acts.map((a) => a.id));
  const vers = verifications.filter((v) => actIds.has(v.action_id));
  return {
    totals: {
      cases: cases.length,
      closed: cases.filter((c) => c.status === "cerrado").length,
      open: cases.filter((c) => c.status !== "cerrado" && c.status !== "anulado").length,
      actions: acts.length,
      done: acts.filter((a) => DONE_STATUSES.includes(a.status)).length,
      overdue: acts.filter((a) => isOverdue(a, today)).length,
      verifications: vers.length,
    },
    compliance: compliance(acts),
    avgCloseDays: avgCloseDays(cases),
    byType: count(cases, (c) => c.type),
    byCaseStatus: count(cases, (c) => c.status),
    byArea: count(cases, (c) => c.area_name ?? "Sin área"),
    byActionStatus: count(acts, (a) => a.status as ActionStatus),
    rootCauses: count(
      causes.filter((c) => c.cause_type === "raiz" && ids.has(c.case_id)),
      (c) => c.label,
    ).slice(0, 10),
    verificationResults: count(vers, (v) => v.result),
  };
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}
