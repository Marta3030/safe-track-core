import { cn } from "@/lib/utils";
import {
  CASE_SEVERITY_LABELS,
  CASE_SEVERITY_TONE,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONE,
  CASE_TYPE_LABELS,
  type CaseSeverity,
  type CaseStatus,
  type CaseType,
} from "@/lib/cases";

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return <span className={cn(base, CASE_STATUS_TONE[status], className)}>{CASE_STATUS_LABELS[status]}</span>;
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: CaseSeverity;
  className?: string;
}) {
  return (
    <span className={cn(base, CASE_SEVERITY_TONE[severity], className)}>
      {CASE_SEVERITY_LABELS[severity]}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: CaseType; className?: string }) {
  return (
    <span className={cn(base, "border border-border bg-card text-foreground", className)}>
      {CASE_TYPE_LABELS[type]}
    </span>
  );
}
