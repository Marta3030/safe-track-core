import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  interviewsQueryKey,
  investigationQueryKey,
  useInterviews,
  useInvestigation,
  type InterviewRow,
  type InvestigationRow,
} from "@/hooks/use-investigation";
import { fromLocalInput, toLocalInput } from "@/lib/cases";

const METHODOLOGIES = [
  "Árbol de causas",
  "5 Porqués",
  "Espina de pescado (Ishikawa)",
  "TapRooT",
  "Otra",
];

type Draft = {
  methodology: string;
  started_at: string;
  finished_at: string;
  team: string;
  facts_summary: string;
  event_sequence: string;
  conditions_description: string;
  equipment_involved: string;
  procedures_review: string;
  prior_training: string;
  existing_controls: string;
  observations: string;
  conclusions: string;
};

function toDraft(row: InvestigationRow): Draft {
  return {
    methodology: row.methodology ?? METHODOLOGIES[0]!,
    started_at: toLocalInput(row.started_at),
    finished_at: row.finished_at ? toLocalInput(row.finished_at) : "",
    team: row.team ?? "",
    facts_summary: row.facts_summary ?? "",
    event_sequence: row.event_sequence ?? "",
    conditions_description: row.conditions_description ?? "",
    equipment_involved: row.equipment_involved ?? "",
    procedures_review: row.procedures_review ?? "",
    prior_training: row.prior_training ?? "",
    existing_controls: row.existing_controls ?? "",
    observations: row.observations ?? "",
    conclusions: row.conclusions ?? "",
  };
}

function draftToPayload(draft: Draft) {
  return {
    methodology: draft.methodology,
    started_at: draft.started_at ? fromLocalInput(draft.started_at) : new Date().toISOString(),
    finished_at: draft.finished_at ? fromLocalInput(draft.finished_at) : null,
    team: draft.team || null,
    facts_summary: draft.facts_summary || null,
    event_sequence: draft.event_sequence || null,
    conditions_description: draft.conditions_description || null,
    equipment_involved: draft.equipment_involved || null,
    procedures_review: draft.procedures_review || null,
    prior_training: draft.prior_training || null,
    existing_controls: draft.existing_controls || null,
    observations: draft.observations || null,
    conclusions: draft.conclusions || null,
  };
}

type Props = {
  caseId: string;
  canManage: boolean;
  userId: string | null;
};

export function InvestigationPanel({ caseId, canManage, userId }: Props) {
  const queryClient = useQueryClient();
  const { data: investigation, isLoading } = useInvestigation(caseId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (investigation && !draft) setDraft(toDraft(investigation));
  }, [investigation, draft]);

  const save = useCallback(
    async (next: Draft) => {
      setStatus("saving");
      try {
        const payload = draftToPayload(next);
        if (investigation) {
          const { error } = await supabase
            .from("investigations")
            .update(payload)
            .eq("id", investigation.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("investigations").insert({
            ...payload,
            case_id: caseId,
            lead_investigator_id: userId,
            created_by: userId,
          });
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: investigationQueryKey(caseId) });
        }
        setStatus("saved");
        setSavedAt(new Date());
      } catch (e) {
        setStatus("error");
        toast.error((e as Error).message || "No fue posible guardar la investigación");
      }
    },
    [caseId, investigation, queryClient, userId],
  );

  const update = (patch: Partial<Draft>) => {
    setDraft((current) => {
      const base = current ?? emptyDraft();
      const next = { ...base, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(next), 900);
      setStatus("saving");
      return next;
    });
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = draft ?? (investigation ? toDraft(investigation) : emptyDraft());

  const statusLabel = useMemo(() => {
    if (!canManage) return "Sólo lectura";
    if (status === "saving") return "Guardando…";
    if (status === "error") return "Error al guardar";
    if (status === "saved" && savedAt)
      return `Guardado ${savedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
    return investigation ? "Guardado" : "Sin iniciar";
  }, [canManage, status, savedAt, investigation]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const disabled = !canManage;

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <h3 className="text-sm font-semibold">Investigación del evento</h3>
          <p className="text-xs text-muted-foreground">
            Los cambios se guardan automáticamente mientras escribes.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === "saving" && canManage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {statusLabel}
        </span>
      </div>

      <section className="surface-card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Metodología</Label>
          <Select
            value={value.methodology}
            disabled={disabled}
            onValueChange={(v) => update({ methodology: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODOLOGIES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-start">Inicio</Label>
          <Input
            id="inv-start"
            type="datetime-local"
            value={value.started_at}
            disabled={disabled}
            onChange={(e) => update({ started_at: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-end">Cierre</Label>
          <Input
            id="inv-end"
            type="datetime-local"
            value={value.finished_at}
            disabled={disabled}
            onChange={(e) => update({ finished_at: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-team">Equipo investigador</Label>
          <Input
            id="inv-team"
            value={value.team}
            disabled={disabled}
            placeholder="Nombres separados por coma"
            onChange={(e) => update({ team: e.target.value })}
          />
        </div>
      </section>

      <section className="surface-card grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
        <TextBlock
          label="Resumen de los hechos"
          value={value.facts_summary}
          disabled={disabled}
          onChange={(v) => update({ facts_summary: v })}
        />
        <TextBlock
          label="Secuencia del evento"
          hint="Describe paso a paso qué ocurrió antes, durante y después."
          value={value.event_sequence}
          disabled={disabled}
          onChange={(v) => update({ event_sequence: v })}
        />
        <TextBlock
          label="Condiciones del lugar"
          hint="Iluminación, piso, clima, orden y limpieza, ruido, etc."
          value={value.conditions_description}
          disabled={disabled}
          onChange={(v) => update({ conditions_description: v })}
        />
        <TextBlock
          label="Equipos y herramientas involucrados"
          value={value.equipment_involved}
          disabled={disabled}
          onChange={(v) => update({ equipment_involved: v })}
        />
        <TextBlock
          label="Procedimientos aplicables"
          hint="¿Existían? ¿Se conocían? ¿Se cumplieron?"
          value={value.procedures_review}
          disabled={disabled}
          onChange={(v) => update({ procedures_review: v })}
        />
        <TextBlock
          label="Capacitación previa"
          hint="Cursos, inducciones y registros de la persona afectada."
          value={value.prior_training}
          disabled={disabled}
          onChange={(v) => update({ prior_training: v })}
        />
        <TextBlock
          label="Controles existentes"
          hint="Barreras, EPP y controles vigentes al momento del evento."
          value={value.existing_controls}
          disabled={disabled}
          onChange={(v) => update({ existing_controls: v })}
        />
        <TextBlock
          label="Observaciones"
          value={value.observations}
          disabled={disabled}
          onChange={(v) => update({ observations: v })}
        />
        <div className="lg:col-span-2">
          <TextBlock
            label="Conclusiones de la investigación"
            value={value.conclusions}
            disabled={disabled}
            onChange={(v) => update({ conclusions: v })}
          />
        </div>
      </section>

      <InterviewsSection
        investigationId={investigation?.id ?? null}
        canManage={canManage}
        userId={userId}
      />
    </div>
  );
}

function emptyDraft(): Draft {
  return {
    methodology: METHODOLOGIES[0]!,
    started_at: toLocalInput(null),
    finished_at: "",
    team: "",
    facts_summary: "",
    event_sequence: "",
    conditions_description: "",
    equipment_involved: "",
    procedures_review: "",
    prior_training: "",
    existing_controls: "",
    observations: "",
    conclusions: "",
  };
}

function TextBlock({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Textarea
        id={fieldId}
        rows={4}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

type InterviewDraft = {
  interviewee_name: string;
  interviewee_role: string;
  relation_to_event: string;
  interviewed_at: string;
  statement: string;
  notes: string;
};

function InterviewsSection({
  investigationId,
  canManage,
  userId,
}: {
  investigationId: string | null;
  canManage: boolean;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: interviews, isLoading } = useInterviews(investigationId);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<InterviewDraft>(emptyInterview());

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: interviewsQueryKey(investigationId) });

  const create = useMutation({
    mutationFn: async () => {
      if (!investigationId) throw new Error("Primero completa los datos de la investigación.");
      if (!form.interviewee_name.trim()) throw new Error("Indica el nombre de la persona entrevistada.");
      const { error } = await supabase.from("investigation_interviews").insert({
        investigation_id: investigationId,
        interviewee_name: form.interviewee_name.trim(),
        interviewee_role: form.interviewee_role || null,
        relation_to_event: form.relation_to_event || null,
        interviewed_at: fromLocalInput(form.interviewed_at),
        statement: form.statement || null,
        notes: form.notes || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrevista registrada");
      setForm(emptyInterview());
      setAdding(false);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investigation_interviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrevista eliminada");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Entrevistas</h3>
          <p className="text-xs text-muted-foreground">
            Registra la declaración de cada testigo o involucrado.
          </p>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {adding ? "Cancelar" : "Nueva entrevista"}
          </Button>
        )}
      </div>

      {adding && canManage && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/60 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="int-name">Nombre</Label>
            <Input
              id="int-name"
              value={form.interviewee_name}
              onChange={(e) => setForm({ ...form, interviewee_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-role">Cargo</Label>
            <Input
              id="int-role"
              value={form.interviewee_role}
              onChange={(e) => setForm({ ...form, interviewee_role: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-rel">Relación con el evento</Label>
            <Input
              id="int-rel"
              placeholder="Testigo, afectado, supervisor…"
              value={form.relation_to_event}
              onChange={(e) => setForm({ ...form, relation_to_event: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="int-date">Fecha de la entrevista</Label>
            <Input
              id="int-date"
              type="datetime-local"
              value={form.interviewed_at}
              onChange={(e) => setForm({ ...form, interviewed_at: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="int-stmt">Declaración</Label>
            <Textarea
              id="int-stmt"
              rows={4}
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="int-notes">Observaciones del entrevistador</Label>
            <Textarea
              id="int-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              size="sm"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar entrevista
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : !interviews || interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay entrevistas registradas.
        </p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((row: InterviewRow) => (
            <li key={row.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.interviewee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[row.interviewee_role, row.relation_to_event]
                      .filter(Boolean)
                      .join(" · ") || "Sin cargo indicado"}
                    {" · "}
                    {new Date(row.interviewed_at).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar entrevista"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {row.statement && (
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {row.statement}
                </p>
              )}
              {row.notes && (
                <p className="mt-2 text-xs text-muted-foreground">Nota: {row.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function emptyInterview(): InterviewDraft {
  return {
    interviewee_name: "",
    interviewee_role: "",
    relation_to_event: "",
    interviewed_at: toLocalInput(null),
    statement: "",
    notes: "",
  };
}
