import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, History, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, type CaseRow } from "@/lib/cases";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type CheckItem = { key: string; label: string; ok: boolean; detail: string };
export const CLOSURE_RESULTS = ["Cerrado conforme", "Cerrado con observaciones"] as const;

export function useClosureChecklist(caseId: string) {
  return useQuery({
    queryKey: ["case-closure", caseId],
    queryFn: async (): Promise<CheckItem[]> => {
      const { data, error } = await supabase.rpc("case_closure_checklist", { _case_id: caseId });
      if (error) throw error;
      return (data ?? []) as unknown as CheckItem[];
    },
  });
}

function useCaseEvents(caseId: string) {
  return useQuery({
    queryKey: ["case-events", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_events")
        .select("*, actor:profiles!case_events_actor_id_fkey(full_name)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function CaseClosurePanel({ caseRow, canManage }: { caseRow: CaseRow; canManage: boolean }) {
  const qc = useQueryClient();
  const caseId = caseRow.id;
  const checklist = useClosureChecklist(caseId);
  const events = useCaseEvents(caseId);
  const closed = caseRow.status === "cerrado";
  const reportDone = Boolean(caseRow.final_report_completed_at);
  const [report, setReport] = useState(caseRow.final_report ?? "");
  const [miperNa, setMiperNa] = useState(caseRow.miper_not_applicable);
  const [miperReason, setMiperReason] = useState(caseRow.miper_na_reason ?? "");
  const [observation, setObservation] = useState("");
  const [result, setResult] = useState<string>(CLOSURE_RESULTS[0]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["cases"] });
    void qc.invalidateQueries({ queryKey: ["case-closure", caseId] });
    void qc.invalidateQueries({ queryKey: ["case-events", caseId] });
  };

  const update = useMutation({
    mutationFn: async (patch: Database["public"]["Tables"]["cases"]["Update"]) => {
      const { error } = await supabase.from("cases").update(patch).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Guardado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: async () => {
      if (!observation.trim()) throw new Error("Escribe una observación de cierre");
      const { error } = await supabase
        .from("cases")
        .update({ status: "cerrado", closure_observation: observation.trim(), closure_result: result })
        .eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Caso cerrado"); setObservation(""); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = checklist.data ?? [];
  const pending = items.filter((i) => !i.ok);
  const ready = items.length > 0 && pending.length === 0;

  return (
    <div className="space-y-4">
      <section className="surface-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Checklist obligatorio de cierre</h3>
          {!checklist.isLoading && (
            <span className={cn("rounded px-2 py-0.5 text-xs font-medium", ready ? "bg-success/20 text-success" : "bg-destructive/15 text-destructive")}>
              {ready ? "Listo para cierre" : `${pending.length} requisito(s) pendiente(s)`}
            </span>
          )}
        </div>
        {checklist.isLoading ? <Skeleton className="h-48 w-full" /> : checklist.isError ? (
          <p className="text-sm text-destructive">{(checklist.error as Error).message}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.key} className="flex items-start gap-3 py-2">
                {i.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
                <div>
                  <p className="text-sm font-medium">{i.label}</p>
                  <p className={cn("text-xs", i.ok ? "text-muted-foreground" : "text-destructive")}>{i.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Informe final</h3>
        <Textarea rows={5} aria-label="Informe final" value={report} disabled={!canManage || reportDone || closed} onChange={(e) => setReport(e.target.value)} placeholder="Resumen del evento, causas, acciones, eficacia y aprendizajes." />
        {reportDone ? (
          <p className="text-xs text-success">Completado el {formatDateTime(caseRow.final_report_completed_at!)}</p>
        ) : canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ final_report: report })}>Guardar borrador</Button>
            <Button size="sm" disabled={update.isPending || report.trim().length < 20} onClick={() => update.mutate({ final_report: report, final_report_completed_at: new Date().toISOString() })}>Marcar informe completado</Button>
          </div>
        )}
      </section>

      {canManage && !closed && (
        <section className="surface-card space-y-3 p-5">
          <h3 className="text-sm font-semibold">MIPER cuando corresponda</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={miperNa} onCheckedChange={(v) => setMiperNa(v === true)} /> La revisión MIPER no aplica a este caso
          </label>
          {miperNa && <Textarea rows={2} aria-label="Justificación MIPER" value={miperReason} onChange={(e) => setMiperReason(e.target.value)} placeholder="Justifica por qué no corresponde revisar la MIPER" />}
          <Button size="sm" variant="outline" disabled={update.isPending || (miperNa && !miperReason.trim())} onClick={() => update.mutate({ miper_not_applicable: miperNa, miper_na_reason: miperNa ? miperReason.trim() : null })}>Guardar</Button>
        </section>
      )}

      <section className="surface-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" />Cierre del caso</h3>
        {closed ? (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-muted-foreground">Estado final</dt><dd>{caseRow.closure_result ?? "Cerrado"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Fecha y hora</dt><dd>{caseRow.closed_at ? formatDateTime(caseRow.closed_at) : "—"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Cerrado por</dt><dd>{events.data?.find((e) => e.event_type === "closed")?.actor?.full_name ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase text-muted-foreground">Observación</dt><dd>{caseRow.closure_observation ?? "—"}</dd></div>
          </dl>
        ) : !canManage ? (
          <p className="text-sm text-muted-foreground">Tu perfil sólo tiene permisos de consulta.</p>
        ) : (
          <>
            {!ready && pending.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">No se puede cerrar el caso porque falta:</p>
                <ul className="mt-1 list-disc pl-5">{pending.map((p) => <li key={p.key}>{p.label}: {p.detail}</li>)}</ul>
              </div>
            )}
            {caseRow.status !== "verificacion" && (
              <p className="text-xs text-muted-foreground">El caso debe estar en estado “Verificación” para cerrarse.</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Estado final</Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger aria-label="Estado final"><SelectValue /></SelectTrigger>
                  <SelectContent>{CLOSURE_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Observación de cierre</Label>
                <Textarea rows={2} aria-label="Observación de cierre" value={observation} onChange={(e) => setObservation(e.target.value)} />
              </div>
            </div>
            <Button disabled={!ready || caseRow.status !== "verificacion" || !observation.trim() || close.isPending} onClick={() => close.mutate()}>
              {close.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cerrar caso
            </Button>
          </>
        )}
      </section>

      <section className="surface-card space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Timeline y registro de auditoría</h3>
        {events.isLoading ? <Skeleton className="h-24 w-full" /> : (events.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
        ) : (
          <ol className="space-y-2 border-l border-border pl-4">
            {(events.data ?? []).map((e) => {
              const d = (e.data ?? {}) as Record<string, unknown>;
              return (
                <li key={e.id} className="text-sm">
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.created_at)} · {e.actor?.full_name ?? "Sistema"}</p>
                  {typeof d["observation"] === "string" && <p className="text-xs">Observación: {d["observation"]}</p>}
                  {typeof d["reason"] === "string" && <p className="text-xs">Motivo: {d["reason"]}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
