import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Clock,
  FileSearch,
  Percent,
  TimerReset,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModulePage } from "@/components/layout/ModulePage";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardData } from "@/hooks/use-dashboard";
import { computeDashboard, isOverdue } from "@/lib/dashboard";
import { CASE_TYPES, CASE_TYPE_LABELS, type CaseType } from "@/lib/cases";
import { ACTION_STATUS_LABELS, type ActionStatus } from "@/lib/actions";

type Search = { months: number; center: string; type: string };

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (s: Record<string, unknown>): { months?: number | undefined; center?: string | undefined; type?: string | undefined } => ({
    months: [3, 6, 12, 24].includes(Number(s["months"])) ? Number(s["months"]) : undefined,
    center: typeof s["center"] === "string" ? s["center"] : undefined,
    type: typeof s["type"] === "string" ? s["type"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Panel de indicadores de seguridad y salud en el trabajo: accidentes abiertos, acciones vencidas y cumplimiento preventivo.",
      },
      { property: "og:title", content: "Dashboard | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Indicadores de accidentabilidad, planes de acción y cumplimiento preventivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
} as const;

function Empty() {
  return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos en el período</p>;
}

function DashboardPage() {
  const raw = Route.useSearch();
  const search: Search = { months: raw.months ?? 12, center: raw.center ?? "all", type: raw.type ?? "all" };
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, error } = useDashboardData();
  const set = (patch: Partial<Search>) => navigate({ search: (p) => ({ ...p, ...patch }) });

  const view = useMemo(() => {
    if (!data) return null;
    const cases = data.cases.filter(
      (c) =>
        (search.center === "all" || c.work_center_id === search.center) &&
        (search.type === "all" || c.type === search.type),
    );
    const filtered = search.center !== "all" || search.type !== "all";
    const ids = new Set(cases.map((c) => c.id));
    const actions = filtered ? data.actions.filter((a) => a.case_id && ids.has(a.case_id)) : data.actions;
    const d = computeDashboard(cases, actions, data.causes, search.months);

    const now = Date.now();
    const overdue = actions.filter((a) => isOverdue(a));
    const toVerify = actions.filter((a) => a.status === "evidencia_cargada" || a.status === "en_verificacion");
    const noInv = cases.filter(
      (c) =>
        !["borrador", "cerrado", "anulado"].includes(c.status) &&
        !c.has_investigation &&
        now - new Date(c.reported_at).getTime() > 48 * 3600_000,
    );
    const trainings = data.pendingTrainings.filter((t) => !filtered || (t.source_case_id && ids.has(t.source_case_id)));
    const reviews = data.hazards.filter((h) => h.next_review_at && new Date(h.next_review_at).getTime() < now);
    const critical = data.hazards.filter((h) => h.risk_level === "critico");
    const attention = [
      { label: "Acciones vencidas", n: overdue.length, detail: "superaron su fecha compromiso", tone: "alta", to: "/planes-accion" },
      { label: "Casos sin investigación", n: noInv.length, detail: "reportados hace más de 48 h", tone: "alta", to: "/casos" },
      { label: "Verificaciones pendientes", n: toVerify.length, detail: "acciones con evidencia por revisar", tone: "media", to: "/planes-accion" },
      { label: "Capacitaciones obligatorias", n: trainings.length, detail: "pendientes de realizar", tone: "media", to: "/capacitaciones" },
      { label: "Riesgos críticos MIPER", n: critical.length, detail: "requieren controles prioritarios", tone: "alta", to: "/miper" },
      { label: "Revisiones MIPER vencidas", n: reviews.length, detail: "con fecha de revisión pasada", tone: "baja", to: "/miper" },
    ].filter((i) => i.n > 0);
    return { ...d, attention };
  }, [data, search]);

  const k = view?.kpis;
  const kpis = [
    { label: "Accidentes abiertos", value: k ? String(k.openAccidents) : "–", icon: AlertTriangle, tone: "danger" as const },
    { label: "Investigaciones pendientes", value: k ? String(k.pendingInvestigations) : "–", icon: FileSearch, tone: "warning" as const },
    { label: "Acciones abiertas", value: k ? String(k.openActions) : "–", icon: ClipboardList, tone: "primary" as const },
    { label: "Acciones vencidas", value: k ? String(k.overdueActions) : "–", icon: Clock, tone: "danger" as const },
    { label: "Cumplimiento de acciones", value: k?.compliance != null ? `${k.compliance}%` : "–", icon: Percent, tone: "success" as const, hint: "Acciones eficaces o cerradas sobre el total" },
    { label: "Casos cerrados", value: k ? String(k.closedCases) : "–", icon: CheckCircle2, tone: "success" as const, hint: "En el período seleccionado" },
    { label: "Tiempo promedio de cierre", value: k?.avgCloseDays != null ? `${k.avgCloseDays} d` : "–", icon: TimerReset, tone: "neutral" as const, hint: "Desde el registro hasta el cierre" },
  ];

  return (
    <ModulePage title="Dashboard" subtitle="Visión general de accidentabilidad y gestión preventiva">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={String(search.months)} onValueChange={(v) => set({ months: Number(v) })}>
            <SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 6, 12, 24].map((m) => <SelectItem key={m} value={String(m)}>Últimos {m} meses</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={search.center} onValueChange={(v) => set({ center: v })}>
            <SelectTrigger aria-label="Centro de trabajo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {data?.centers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={search.type} onValueChange={(v) => set({ type: v })}>
            <SelectTrigger aria-label="Tipo de evento"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {CASE_TYPES.map((t) => <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No se pudieron cargar los indicadores. Intenta recargar la página.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? kpis.map((x) => <Skeleton key={x.label} className="h-24" />)
            : kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        {view && (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <SectionCard title="Accidentes por mes" description="Accidentes/enfermedades vs. otros eventos">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={view.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="accidentes" name="Accidentes" stackId="a" fill="var(--color-chart-4)" />
                        <Bar dataKey="otros" name="Incidentes y otros" stackId="a" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
              <SectionCard
                title="Requiere atención"
                description="Pendientes que bloquean el cierre de casos"
              >
                {view.attention.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Todo al día. No hay pendientes críticos.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {view.attention.map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="flex items-start justify-between gap-3 py-3 hover:opacity-80">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.n} {item.detail}</p>
                          </div>
                          <Badge variant={item.tone === "alta" ? "destructive" : "secondary"} className="shrink-0 capitalize">
                            {item.tone}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <SectionCard title="Eventos por área" description="Concentración por área operativa">
                <div className="h-64 w-full">
                  {view.byArea.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={view.byArea} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" allowDecimals={false} fontSize={12} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={100} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)" }} />
                        <Bar dataKey="total" name="Eventos" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <Empty />}
                </div>
              </SectionCard>

              <SectionCard title="Eventos por tipo" description="Clasificación del evento">
                <div className="h-64 w-full">
                  {view.byType.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={view.byType.map((t) => ({ ...t, name: CASE_TYPE_LABELS[t.name as CaseType] ?? t.name }))}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {view.byType.map((t, i) => <Cell key={t.name} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <Empty />}
                </div>
              </SectionCard>

              <SectionCard title="Principales causas" description="Causas registradas en análisis causal">
                <div className="h-64 w-full">
                  {view.topCauses.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={view.topCauses} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis type="number" allowDecimals={false} fontSize={12} axisLine={false} />
                        <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)" }} />
                        <Bar dataKey="total" name="Casos" fill="var(--color-chart-5)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <Empty />}
                </div>
              </SectionCard>

              <SectionCard title="Acciones por estado" description="Distribución del plan de acción">
                <div className="h-64 w-full">
                  {view.byStatus.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={view.byStatus.map((s) => ({ ...s, name: ACTION_STATUS_LABELS[s.name as ActionStatus] ?? s.name }))}
                          dataKey="total"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {view.byStatus.map((s, i) => <Cell key={s.name} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <Empty />}
                </div>
              </SectionCard>

              <div className="lg:col-span-2">
                <SectionCard title="Tendencia de cumplimiento" description="% de acciones con vencimiento en el mes que fueron cumplidas">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={view.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                        <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                        <Line type="monotone" dataKey="cumplimiento" name="Cumplimiento" connectNulls stroke="var(--color-chart-3)" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </ModulePage>
  );
}
