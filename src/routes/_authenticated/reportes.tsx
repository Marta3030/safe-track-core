import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { CheckCircle2, ClipboardList, Download, FileWarning, Percent, ShieldCheck, TimerReset, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModulePage } from "@/components/layout/ModulePage";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReportData } from "@/hooks/use-reports";
import { EMPTY_FILTERS, buildReport, filterCases, toCsv, type ReportFilters } from "@/lib/reports";
import { CASE_STATUSES, CASE_STATUS_LABELS, CASE_TYPES, CASE_TYPE_LABELS, type CaseStatus, type CaseType } from "@/lib/cases";
import { ACTION_STATUS_LABELS, type ActionStatus } from "@/lib/actions";

const KEYS = Object.keys(EMPTY_FILTERS) as (keyof ReportFilters)[];

export const Route = createFileRoute("/_authenticated/reportes")({
  validateSearch: (s: Record<string, unknown>): Partial<ReportFilters> => {
    const out: Partial<ReportFilters> = {};
    for (const k of KEYS) if (typeof s[k] === "string" && s[k]) out[k] = s[k] as string;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Reportes e Indicadores | Safety360 HSEQ" },
      { name: "description", content: "Reportes de accidentabilidad, cumplimiento de acciones, causas raíz y tiempo promedio de cierre." },
      { property: "og:title", content: "Reportes e Indicadores | Safety360 HSEQ" },
      { property: "og:description", content: "Indicadores preventivos filtrables por empresa, centro, área y período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
} as const;
const VER_LABELS: Record<string, string> = { eficaz: "Eficaz", parcialmente_eficaz: "Parcialmente eficaz", no_eficaz: "No eficaz" };
const ALL = "__all";

function HBar({ data, empty }: { data: { name: string; total: number }[]; empty: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} fontSize={12} />
        <YAxis type="category" dataKey="name" width={140} fontSize={12} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="total" name="Total" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReportsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/reportes" });
  const f: ReportFilters = { ...EMPTY_FILTERS, ...search };
  const { data, isLoading, error } = useReportData();

  const set = (patch: Partial<ReportFilters>) =>
    navigate({
      search: () => {
        const next = { ...f, ...patch };
        const out: Partial<ReportFilters> = {};
        for (const k of KEYS) if (next[k]) out[k] = next[k];
        return out;
      },
      replace: true,
    });

  const filtered = useMemo(() => (data ? filterCases(data.cases, f) : []), [data, JSON.stringify(f)]);
  const report = useMemo(
    () => (data ? buildReport(filtered, data.actions, data.causes, data.verifications) : null),
    [data, filtered],
  );

  const centers = (data?.centers ?? []).filter((c) => !f.org || c.organization_id === f.org);
  const areas = (data?.areas ?? []).filter((a) => !f.center || a.work_center_id === f.center);
  const centerName = new Map((data?.centers ?? []).map((c) => [c.id, c.name]));

  const exportCsv = () => {
    const rows: (string | number | null)[][] = [
      ["Código", "Título", "Tipo", "Estado", "Fecha", "Centro", "Área", "Cerrado"],
      ...filtered.map((c) => [
        c.code, c.title, CASE_TYPE_LABELS[c.type], CASE_STATUS_LABELS[c.status], c.occurred_at.slice(0, 10),
        c.work_center_id ? centerName.get(c.work_center_id) ?? "" : "", c.area_name, c.closed_at?.slice(0, 10) ?? "",
      ]),
    ];
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-casos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sel = (label: string, key: keyof ReportFilters, opts: { value: string; label: string }[], reset: Partial<ReportFilters> = {}) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={f[key] || ALL} onValueChange={(v) => set({ [key]: v === ALL ? "" : v, ...reset })}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const active = KEYS.some((k) => f[k]);

  return (
    <ModulePage title="Reportes e Indicadores" subtitle="Análisis de casos, acciones y verificaciones">
      <div className="space-y-5">
        <section className="surface-card p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {sel("Empresa", "org", (data?.orgs ?? []).map((o) => ({ value: o.id, label: o.name })), { center: "", area: "" })}
            {sel("Centro", "center", centers.map((c) => ({ value: c.id, label: c.name })), { area: "" })}
            {sel("Área", "area", areas.map((a) => ({ value: a.id, label: a.name })))}
            <div className="space-y-1">
              <Label htmlFor="r-from" className="text-xs">Desde</Label>
              <Input id="r-from" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="r-to" className="text-xs">Hasta</Label>
              <Input id="r-to" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
            {sel("Tipo de evento", "type", CASE_TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABELS[t] })))}
            {sel("Estado", "status", CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] })))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{filtered.length} casos en el reporte</p>
            <div className="flex gap-2">
              {active && (
                <Button variant="ghost" size="sm" onClick={() => navigate({ search: {}, replace: true })}>
                  <X className="h-4 w-4" /> Limpiar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-destructive">No se pudieron cargar los datos: {(error as Error).message}</p>}

        {isLoading || !report ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard label="Casos" value={String(report.totals.cases)} hint={`${report.totals.open} abiertos`} icon={FileWarning} tone="primary" />
              <KpiCard label="Casos cerrados" value={String(report.totals.closed)} icon={CheckCircle2} tone="success" />
              <KpiCard label="Tiempo prom. cierre" value={report.avgCloseDays === null ? "—" : `${report.avgCloseDays} d`} hint="Desde registro a cierre" icon={TimerReset} />
              <KpiCard label="Cumplimiento" value={report.compliance === null ? "—" : `${report.compliance}%`} hint={`${report.totals.done} de ${report.totals.actions} acciones`} icon={Percent} tone={report.compliance !== null && report.compliance < 70 ? "warning" : "success"} />
              <KpiCard label="Acciones vencidas" value={String(report.totals.overdue)} icon={ClipboardList} tone={report.totals.overdue ? "danger" : "neutral"} />
              <KpiCard label="Verificaciones" value={String(report.totals.verifications)} icon={ShieldCheck} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Resumen de accidentes por tipo">
                <HBar data={report.byType.map((d) => ({ ...d, name: CASE_TYPE_LABELS[d.name as CaseType] ?? d.name }))} empty="Sin casos para los filtros." />
              </SectionCard>
              <SectionCard title="Casos por estado">
                <HBar data={report.byCaseStatus.map((d) => ({ ...d, name: CASE_STATUS_LABELS[d.name as CaseStatus] ?? d.name }))} empty="Sin casos para los filtros." />
              </SectionCard>
              <SectionCard title="Estado de acciones" description="Acciones de los casos filtrados">
                <HBar data={report.byActionStatus.map((d) => ({ ...d, name: ACTION_STATUS_LABELS[d.name as ActionStatus] ?? d.name }))} empty="Sin acciones registradas." />
              </SectionCard>
              <SectionCard title="Resultado de verificaciones de eficacia">
                <HBar data={report.verificationResults.map((d) => ({ ...d, name: VER_LABELS[d.name] ?? d.name }))} empty="Sin verificaciones registradas." />
              </SectionCard>
              <SectionCard title="Principales causas raíz" description="Causas confirmadas como raíz por el profesional">
                <HBar data={report.rootCauses} empty="Aún no hay causas raíz registradas." />
              </SectionCard>
              <SectionCard title="Accidentes por área">
                <HBar data={report.byArea} empty="Sin casos para los filtros." />
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </ModulePage>
  );
}
