import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, FolderOpen, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeverityBadge, StatusBadge, TypeBadge } from "@/components/cases/CaseBadges";
import { CaseFormDialog } from "@/components/cases/CaseFormDialog";
import { useCases, type CaseListRow } from "@/hooks/use-cases";
import { useSession } from "@/hooks/use-session";
import { canManageCases } from "@/lib/roles";
import {
  CASE_SEVERITIES,
  CASE_SEVERITY_LABELS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_TYPES,
  CASE_TYPE_LABELS,
  formatDate,
} from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/casos")({
  head: () => ({
    meta: [
      { title: "Accidentes e Incidentes | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Listado y expediente digital de accidentes, incidentes y casi accidentes laborales.",
      },
      { property: "og:title", content: "Accidentes e Incidentes | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Gestión completa del ciclo de investigación de eventos laborales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CasesPage,
});

const ALL = "todos";

function CasesPage() {
  const navigate = useNavigate();
  const { profile, user, role } = useSession();
  const { data, isLoading, isError, error, refetch, isFetching } = useCases();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [severity, setSeverity] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CaseListRow | null>(null);

  const canManage = canManageCases(role) || role === "supervisor";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (type !== ALL && c.type !== type) return false;
      if (severity !== ALL && c.severity !== severity) return false;
      if (status !== ALL && c.status !== status) return false;
      if (!term) return true;
      return [
        c.code,
        c.title,
        c.description,
        c.affected_person_name,
        c.location_detail,
        c.work_centers?.name,
        c.areas?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, search, type, severity, status]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: CaseListRow) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const resetFilters = () => {
    setSearch("");
    setType(ALL);
    setSeverity(ALL);
    setStatus(ALL);
  };

  const filtersActive = search !== "" || type !== ALL || severity !== ALL || status !== ALL;

  return (
    <ModulePage title="Accidentes e Incidentes" subtitle="Listado de casos y expediente digital">
      <div className="space-y-4">
        {/* Filtros */}
        <section className="surface-card space-y-3 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, título, persona o lugar…"
                className="pl-9"
                aria-label="Buscar casos"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => void refetch()}
                aria-label="Actualizar listado"
              >
                <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
              {canManage && (
                <Button onClick={openNew} className="flex-1 md:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo caso
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los tipos</SelectItem>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger aria-label="Filtrar por gravedad"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toda gravedad</SelectItem>
                {CASE_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>{CASE_SEVERITY_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {CASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{CASE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} de {data?.length ?? 0} casos
            </span>
            {filtersActive && (
              <button type="button" className="underline" onClick={resetFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        {isError && (
          <div className="surface-card p-6 text-sm text-destructive">
            No fue posible cargar los casos: {(error as Error)?.message}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {filtersActive
                ? "Ningún caso coincide con la búsqueda o los filtros aplicados."
                : "Todavía no hay casos registrados."}
            </p>
            {canManage && !filtersActive && (
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar el primer caso
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Tarjetas (móvil / tablet) */}
            <ul className="grid gap-3 lg:hidden">
              {filtered.map((c) => (
                <li key={c.id} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                      <p className="truncate font-semibold">{c.title}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <TypeBadge type={c.type} />
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(c.occurred_at)} · {c.work_centers?.name ?? "Sin centro"}
                    {c.areas?.name ? ` · ${c.areas.name}` : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        void navigate({ to: "/casos/$caseId", params: { caseId: c.id } })
                      }
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Expediente
                    </Button>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Tabla (desktop) */}
            <div className="surface-card hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Evento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Gravedad</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                      <td className="max-w-[280px] px-4 py-3">
                        <span className="line-clamp-1 font-medium">{c.title}</span>
                        {c.affected_person_name && (
                          <span className="block text-xs text-muted-foreground">
                            {c.affected_person_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={c.type} /></td>
                      <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.work_centers?.name ?? "—"}
                        {c.areas?.name ? ` / ${c.areas.name}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs">{formatDate(c.occurred_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void navigate({ to: "/casos/$caseId", params: { caseId: c.id } })
                            }
                          >
                            <FolderOpen className="mr-1.5 h-4 w-4" />
                            Expediente
                          </Button>
                          {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CaseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseRow={editing}
        defaultOrganizationId={profile?.organization_id ?? null}
        userId={user?.id ?? null}
      />
    </ModulePage>
  );
}
