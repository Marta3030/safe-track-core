import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, buildReport, filterCases, type ReportCase } from "./reports";

const base: ReportCase = {
  id: "c1", code: null, title: "t", type: "accidente", status: "cerrado",
  occurred_at: "2026-03-10T10:00:00Z", reported_at: "2026-03-10T10:00:00Z",
  created_at: "2026-03-10T00:00:00Z", closed_at: "2026-03-20T00:00:00Z",
  work_center_id: "w1", area_name: "Bodega", has_investigation: true, investigation_finished: true,
  organization_id: "o1", area_id: "a1", severity: "leve",
};
const other: ReportCase = { ...base, id: "c2", area_id: "a2", area_name: "Taller", type: "incidente", status: "reportado", closed_at: null, occurred_at: "2026-06-01T10:00:00Z" };

describe("reports", () => {
  it("filters by area and date range", () => {
    expect(filterCases([base, other], { ...EMPTY_FILTERS, area: "a2" }).map((c) => c.id)).toEqual(["c2"]);
    expect(filterCases([base, other], { ...EMPTY_FILTERS, from: "2026-04-01" }).map((c) => c.id)).toEqual(["c2"]);
  });

  it("counts only root causes and only actions of filtered cases", () => {
    const r = buildReport(
      [base],
      [
        { id: "x", description: "", status: "cerrada", due_date: null, completed_at: null, case_id: "c1" },
        { id: "y", description: "", status: "pendiente", due_date: null, completed_at: null, case_id: "c2" },
      ],
      [
        { case_id: "c1", cause_type: "raiz", label: "Falta de procedimiento" },
        { case_id: "c1", cause_type: "inmediata", label: "Piso resbaloso" },
      ],
      [],
    );
    expect(r.totals.actions).toBe(1);
    expect(r.compliance).toBe(100);
    expect(r.avgCloseDays).toBe(10);
    expect(r.rootCauses).toEqual([{ name: "Falta de procedimiento", total: 1 }]);
  });
});
