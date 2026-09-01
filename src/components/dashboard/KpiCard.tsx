import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "primary" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<KpiTone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary/15 text-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
};

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: KpiTone;
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "neutral" }: KpiCardProps) {
  return (
    <div className="surface-card flex items-start gap-4 p-4 md:p-5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASSES[tone],
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="font-display text-2xl leading-tight font-bold md:text-3xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
