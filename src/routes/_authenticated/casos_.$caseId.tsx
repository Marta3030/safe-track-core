import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge, StatusBadge, TypeBadge } from "@/components/cases/CaseBadges";
import { CaseFormDialog } from "@/components/cases/CaseFormDialog";
import { InvestigationPanel } from "@/components/cases/InvestigationPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCase, casesQueryKey } from "@/hooks/use-cases";
import { useSession } from "@/hooks/use-session";
import { canManageCases } from "@/lib/roles";
import {
  CASE_STATUS_FLOW,
  CASE_STATUS_LABELS,
  formatDate,
  formatDateTime,
  type CaseStatus,
} from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/casos_/$caseId")({
  head: () => ({
    meta: [
      { title: "Expediente del caso | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Expediente digital del evento laboral: antecedentes, persona afectada, ubicación y estado del proceso.",
      },
      { property: "og:title", content: "Expediente del caso | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Detalle completo del accidente o incidente y su avance de gestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseDetailPage,
});

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value?.toString().trim() ? value : "—"}</dd>
    </div>
  );
}

function CaseDetailPage() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user, role } = useSession();
  const { data, isLoading, isError, error } = useCase(caseId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canManage = canManageCases(role) || role === "supervisor";

  const changeStatus = useMutation({
    mutationFn: async (next: CaseStatus) => {
      const { error: updateError } = await supabase
        .from("cases")
        .update({
          status: next,
          closed_at: next === "cerrado" ? new Date().toISOString() : null,
        })
        .eq("id", caseId);
      if (updateError) throw updateError;
      return next;
    },

    onSuccess: (next) => {
      toast.success(`Caso actualizado a “${CASE_STATUS_LABELS[next]}”`);
      void queryClient.invalidateQueries({ queryKey: casesQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ["cases", caseId] });
    },
    onError: (e: Error) => toast.error(e.message || "No fue posible cambiar el estado"),
  });

  return (
    <ModulePage
      title="Expediente del caso"
      subtitle={data?.code ?? "Detalle del evento registrado"}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/casos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al listado
            </Link>
          </Button>
          {canManage && data && (
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar caso
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="surface-card p-6 text-sm text-destructive">
            No fue posible cargar el caso: {(error as Error)?.message}
          </div>
        ) : !data ? (
          <div className="surface-card space-y-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Este caso no existe o fue eliminado.
            </p>
            <Button onClick={() => void navigate({ to: "/casos" })}>Ir al listado</Button>
          </div>
        ) : (
          <Tabs defaultValue="expediente" className="space-y-4">
            <TabsList>
              <TabsTrigger value="expediente">Expediente</TabsTrigger>
              <TabsTrigger value="investigacion">Investigación</TabsTrigger>
            </TabsList>
            <TabsContent value="expediente" className="space-y-4">
            <section className="surface-card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{data.code}</p>
                  <h2 className="text-lg font-semibold">{data.title}</h2>
                </div>
                <StatusBadge status={data.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <TypeBadge type={data.type} />
                <SeverityBadge severity={data.severity} />
              </div>
              {data.description && (
                <p className="text-sm text-muted-foreground">{data.description}</p>
              )}
            </section>

            <section className="surface-card space-y-4 p-5">
              <h3 className="text-sm font-semibold">Antecedentes del evento</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Fecha del evento" value={formatDateTime(data.occurred_at)} />
                <Field label="Fecha de reporte" value={formatDateTime(data.reported_at)} />
                <Field label="Centro de trabajo" value={data.work_centers?.name ?? null} />
                <Field label="Área" value={data.areas?.name ?? null} />
                <Field label="Lugar exacto" value={data.location_detail} />
                <Field label="Días perdidos" value={String(data.lost_days ?? 0)} />
              </dl>
            </section>

            <section className="surface-card space-y-4 p-5">
              <h3 className="text-sm font-semibold">Persona afectada</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Nombre" value={data.affected_person_name} />
                <Field label="Cargo" value={data.affected_person_job} />
                <Field
                  label="Requiere investigación"
                  value={data.requires_investigation ? "Sí" : "No"}
                />
              </dl>
            </section>

            <section className="surface-card space-y-2 p-5">
              <h3 className="text-sm font-semibold">Acciones inmediatas</h3>
              <p className="text-sm text-muted-foreground">
                {data.immediate_actions?.trim() || "Sin acciones inmediatas registradas."}
              </p>
            </section>

            <section className="surface-card space-y-3 p-5">
              <h3 className="text-sm font-semibold">Estado del proceso</h3>
              <p className="text-xs text-muted-foreground">
                Estado actual: {CASE_STATUS_LABELS[data.status]} · Última actualización{" "}
                {formatDate(data.updated_at)}
                {data.closed_at ? ` · Cerrado el ${formatDate(data.closed_at)}` : ""}
              </p>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  {CASE_STATUS_FLOW[data.status].map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === "anulado" ? "outline" : "default"}
                      disabled={changeStatus.isPending}
                      onClick={() => changeStatus.mutate(next)}
                    >
                      {changeStatus.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Pasar a {CASE_STATUS_LABELS[next]}
                    </Button>
                  ))}
                  {CASE_STATUS_FLOW[data.status].length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay transiciones disponibles desde este estado.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tu perfil sólo tiene permisos de consulta.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <CaseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseRow={data ?? null}
        defaultOrganizationId={profile?.organization_id ?? null}
        userId={user?.id ?? null}
      />
    </ModulePage>
  );
}
