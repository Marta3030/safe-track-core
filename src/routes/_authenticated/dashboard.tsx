import { createFileRoute, Link } from "@tanstack/react-router";
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
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
    ],
  }),
  component: DashboardPage,
});

const KPIS = [
  { label: "Accidentes abiertos", value: "3", icon: AlertTriangle, tone: "danger" as const },
  { label: "Investigaciones pendientes", value: "2", icon: FileSearch, tone: "warning" as const },
  { label: "Acciones abiertas", value: "8", icon: ClipboardList, tone: "primary" as const },
  { label: "Acciones vencidas", value: "2", icon: Clock, tone: "danger" as const },
  { label: "Cumplimiento", value: "72%", icon: Percent, tone: "success" as const },
  { label: "Casos cerrados", value: "5", icon: CheckCircle2, tone: "success" as const },
  {
    label: "Tiempo promedio de cierre",
    value: "18 d",
    icon: TimerReset,
    tone: "neutral" as const,
    hint: "Desde la creación hasta el cierre verificado",
  },
];

const EVENTS_BY_MONTH = [
  { mes: "Ene", eventos: 2 },
  { mes: "Feb", eventos: 1 },
  { mes: "Mar", eventos: 3 },
  { mes: "Abr", eventos: 2 },
  { mes: "May", eventos: 4 },
  { mes: "Jun", eventos: 1 },
];

const EVENTS_BY_AREA = [
  { area: "Mantenimiento", eventos: 5 },
  { area: "Producción", eventos: 3 },
  { area: "Bodega", eventos: 2 },
  { area: "Logística", eventos: 1 },
];

const ACTIONS_BY_STATE = [
  { estado: "Pendiente", total: 3 },
  { estado: "En proceso", total: 2 },
  { estado: "En verificación", total: 1 },
  { estado: "Eficaz", total: 4 },
  { estado: "Vencida", total: 2 },
];

const STATE_COLORS = [
  "var(--color-chart-2)",
  "var(--color-chart-1)",
  "var(--color-chart-5)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

const ATTENTION = [
  { label: "Acciones vencidas", detail: "2 acciones superaron su fecha compromiso", tone: "alta" },
  { label: "Casos sin investigación", detail: "1 caso creado hace más de 48 h", tone: "alta" },
  { label: "Verificaciones pendientes", detail: "1 acción con evidencia por revisar", tone: "media" },
  { label: "Actualizaciones MIPER", detail: "1 peligro no identificado en matriz", tone: "media" },
  { label: "Capacitaciones pendientes", detail: "1 capacitación programada sin evidencia", tone: "baja" },
];

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.5rem",
  fontSize: "0.8125rem",
} as const;

function DashboardPage() {
  return (
    <ModulePage
      title="Dashboard"
      subtitle="Visión general de accidentabilidad y gestión preventiva"
    >
      <div className="space-y-6">
        <DemoBanner />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionCard
              title="Accidentes por mes"
              description="Eventos registrados en el período"
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={EVENTS_BY_MONTH}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="eventos"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Acciones por estado" description="Distribución del plan de acción">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ACTIONS_BY_STATE}
                    dataKey="total"
                    nameKey="estado"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {ACTIONS_BY_STATE.map((entry, index) => (
                      <Cell key={entry.estado} fill={STATE_COLORS[index % STATE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {ACTIONS_BY_STATE.map((entry, index) => (
                <li key={entry.estado} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATE_COLORS[index % STATE_COLORS.length] }}
                  />
                  {entry.estado}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionCard title="Accidentes por área" description="Concentración por área operativa">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={EVENTS_BY_AREA} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="area"
                      width={100}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)" }} />
                    <Bar dataKey="eventos" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Requiere atención"
            description="Pendientes que bloquean el cierre de casos"
            action={
              <Link
                to="/planes-accion"
                className="text-xs font-semibold text-foreground underline underline-offset-4"
              >
                Ver acciones
              </Link>
            }
          >
            <ul className="divide-y divide-border">
              {ATTENTION.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge
                    variant={item.tone === "alta" ? "destructive" : "secondary"}
                    className="shrink-0 capitalize"
                  >
                    {item.tone}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </ModulePage>
  );
}
