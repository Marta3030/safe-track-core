import { describe, expect, it } from "vitest";
import { avgCloseDays, compliance, isOverdue, type DashAction, type DashCase } from "./dashboard";

const act = (status: DashAction["status"], due: string | null = null): DashAction => ({
  id: Math.random().toString(),
  description: "",
  status,
  due_date: due,
  completed_at: null,
  case_id: null,
});

describe("dashboard rules", () => {
  it("compliance excludes cancelled actions", () => {
    expect(compliance([act("eficaz"), act("pendiente"), act("cancelada")])).toBe(50);
  });
  it("pending action past due date is overdue; closed one is not", () => {
    const today = new Date("2026-11-03T12:00:00Z");
    expect(isOverdue(act("pendiente", "2026-11-01"), today)).toBe(true);
    expect(isOverdue(act("cerrada", "2026-11-01"), today)).toBe(false);
  });
  it("average close time in days", () => {
    const c = {
      status: "cerrado",
      created_at: "2026-10-01T00:00:00Z",
      closed_at: "2026-10-11T00:00:00Z",
    } as DashCase;
    expect(avgCloseDays([c])).toBe(10);
  });
});
