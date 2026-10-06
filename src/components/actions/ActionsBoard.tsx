import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Loader2,
  Percent,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";
import { useActions, useCaseCauses, useOrgPeople, type ActionRow } from "@/hooks/use-actions";
import { useCases } from "@/hooks/use-cases";
import {
  ACTION_KINDS,
  ACTION_KIND_LABELS,
  ACTION_STATUSES,
  ACTION_STATUS_LABELS,
  ACTION_STATUS_TONE,
  CONTROL_LABELS,
  CONTROL_TYPES,
  OPEN_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  dueLabel,
  effectiveStatus,
  type ActionKind,
  type ActionStatus,
  type ControlType,
  type Priority,
} from "@/lib/actions";
import { formatDate } from "@/lib/cases";
import { EVIDENCE_ACCEPT, EVIDENCE_BUCKET, buildEvidencePath, validateEvidenceFile } from "@/lib/evidences";

type Props = {
  caseId?: string;
  canManage: boolean; // prevención / administración
  userId: string | null;
};

const ALL = "__all";

export function ActionsBoard({ caseId, canManage, userId }: Props) {
  const { data = [], isLoading, isError, error } = useActions(caseId);
  const people = useOrgPeople();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [resp, setResp] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(
    () => data.map((a) => ({ ...a, eff: effectiveStatus(a.status, a.due_date) })),
    [data],
  );

  const filtered = rows.filter((a) => {
    const text = `${a.description} ${a.action_plans?.cases?.code ?? ""} ${a.action_plans?.cases?.title ?? ""}`.toLowerCase();
    return (
      (!search || text.includes(search.toLowerCase())) &&
      (status === ALL || a.eff === status) &&
      (priority === ALL || a.priority === priority) &&
      (kind === ALL || a.action_kind === kind) &&
      (resp === ALL || a.responsible_id === resp)
    );
  });

  const total = rows.length;
  const open = rows.filter((a) => OPEN_STATUSES.includes(a.eff)).length;
  const overdue = rows.filter((a) => a.eff === "vencida").length;
  const verifying = rows.filter((a) => a.eff === "en_verificacion").length;
  const done = rows.filter((a) => a.eff === "eficaz" || a.eff === "cerrada").length;
  const compliance = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Acciones" value={String(total)} icon={ClipboardList} tone="neutral" />
        <KpiCard label="Abiertas" value={String(open)} icon={Clock} tone="primary" />
        <KpiCard label="Vencidas" value={String(overdue)} icon={AlertTriangle} tone="danger" />
        <KpiCard label="En verificación" value={String(verifying)} icon={ShieldCheck} tone="warning" />
        <KpiCard label="Cumplimiento" value={`${compliance}%`} icon={Percent} tone="success" hint={`${done} eficaces o cerradas`} />
      </div>

      {total > 0 && (
        <div className="surface-card p-4">
          <p className="eyebrow mb-2">Distribución por estado</p>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {ACTION_STATUSES.map((s) => {
              const n = rows.filter((a) => a.eff === s).length;
              if (!n) return null;
              return (
                <div
                  key={s}
                  title={`${ACTION_STATUS_LABELS[s]}: ${n}`}
                  className={cn("h-full", ACTION_STATUS_TONE[s])}
                  style={{ width: `${(n / total) * 100}%`, backgroundColor: "currentColor" }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {ACTION_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(status === s ? ALL : s)}
                className={cn("rounded-full px-2 py-0.5", ACTION_STATUS_TONE[s], status === s && "ring-2 ring-ring")}
              >
                {ACTION_STATUS_LABELS[s]} · {rows.filter((a) => a.eff === s).length}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="surface-card grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          aria-label="Buscar acciones"
          placeholder="Buscar acción o caso…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:col-span-2"
        />
        <FilterSelect label="Estado" value={status} onChange={setStatus} options={ACTION_STATUSES.map((s) => [s, ACTION_STATUS_LABELS[s]])} />
        <FilterSelect label="Prioridad" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => [p, PRIORITY_LABELS[p]])} />
        <FilterSelect label="Tipo" value={kind} onChange={setKind} options={ACTION_KINDS.map((k) => [k, ACTION_KIND_LABELS[k]])} />
        <FilterSelect
          label="Responsable"
          value={resp}
          onChange={setResp}
          options={(people.data ?? []).map((p) => [p.id, p.full_name ?? "Sin nombre"])}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} acción(es)</p>
        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva acción
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : isError ? (
        <div className="surface-card p-4 text-sm text-destructive">{(error as Error).message}</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          No hay acciones que coincidan.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <ActionItem key={a.id} action={a} eff={a.eff} canManage={canManage} userId={userId} showCase={!caseId} />
          ))}
        </ul>
      )}

      <CreateActionDialog open={createOpen} onOpenChange={setCreateOpen} caseId={caseId} userId={userId} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: todos</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActionItem({
  action: a,
  eff,
  canManage,
  userId,
  showCase,
}: {
  action: ActionRow;
  eff: ActionStatus;
  canManage: boolean;
  userId: string | null;
  showCase: boolean;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const isResponsible = userId && a.responsible_id === userId;
  const canWork = canManage || Boolean(isResponsible);
  const caseRow = a.action_plans?.cases;

  const update = useMutation({
    mutationFn: async (patch: Database_ActionUpdate) => {
      const { error } = await supabase.from("actions").update(patch).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acción actualizada");
      void qc.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const err = validateEvidenceFile(file);
      if (err) throw new Error(err);
      const org = a.action_plans?.organization_id;
      const cid = a.action_plans?.case_id ?? "sin-caso";
      if (!org) throw new Error("Organización desconocida");
      const path = buildEvidencePath(org, `${cid}/acciones`, file.name);
      const { error: upErr } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      // El backend la pasa a "En verificación"; nunca se cierra sola.
      const { error } = await supabase
        .from("actions")
        .update({ evidence_path: path, evidence_name: file.name, status: "evidencia_cargada" })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evidencia cargada · la acción pasó a verificación");
      void qc.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const viewEvidence = async () => {
    if (!a.evidence_path) return;
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(a.evidence_path, 120);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <li className="surface-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {showCase && caseRow && (
            <Link
              to="/casos/$caseId"
              params={{ caseId: caseRow.id }}
              className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {caseRow.code} · {caseRow.title}
            </Link>
          )}
          <p className="text-sm font-medium">{a.description}</p>
          {a.investigation_causes && (
            <p className="text-xs text-muted-foreground">
              Causa ({a.investigation_causes.cause_type}): {a.investigation_causes.description}
            </p>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ACTION_STATUS_TONE[eff])}>
          {ACTION_STATUS_LABELS[eff]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <Meta label="Responsable" value={a.responsible?.full_name ?? "—"} />
        <Meta label="Prioridad" value={PRIORITY_LABELS[a.priority]} />
        <Meta label="Tipo" value={`${ACTION_KIND_LABELS[a.action_kind as ActionKind] ?? a.action_kind} · ${CONTROL_LABELS[a.control_type]}`} />
        <Meta label="Fecha compromiso" value={formatDate(a.due_date)} />
        <Meta
          label="Vencimiento"
          value={dueLabel(eff, a.due_date) || (a.completed_at ? `Completada ${formatDate(a.completed_at)}` : "—")}
          danger={eff === "vencida"}
        />
      </dl>

      {a.verification_notes && (
        <p className="rounded-md bg-muted p-2 text-xs">Verificación: {a.verification_notes}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {a.evidence_path && (
          <Button size="sm" variant="outline" onClick={() => void viewEvidence()}>
            <Eye className="mr-2 h-4 w-4" /> {a.evidence_name ?? "Ver evidencia"}
          </Button>
        )}
        {canWork && (eff === "pendiente" || eff === "vencida") && (
          <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ status: "en_progreso" })}>
            Iniciar (En proceso)
          </Button>
        )}
        {canWork && ["pendiente", "en_progreso", "vencida"].includes(eff) && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={EVIDENCE_ACCEPT}
              className="hidden"
              aria-label="Cargar evidencia de la acción"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Cargar evidencia
            </Button>
          </>
        )}
        {canManage && eff === "en_verificacion" && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              aria-label="Notas de verificación"
              placeholder="Notas de verificación de eficacia"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ status: "eficaz", verification_notes: notes || null })}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Eficaz
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={update.isPending || !notes.trim()}
              title="Indica el motivo en las notas"
              onClick={() =>
                update.mutate({ status: "en_progreso", verification_notes: `No eficaz: ${notes}`, evidence_path: null, evidence_name: null })
              }
            >
              No eficaz
            </Button>
          </div>
        )}
        {canManage && eff === "eficaz" && (
          <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ status: "cerrada" })}>
            Cerrar acción
          </Button>
        )}
      </div>
    </li>
  );
}

type Database_ActionUpdate = import("@/integrations/supabase/types").Database["public"]["Tables"]["actions"]["Update"];

function Meta({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", danger && "text-destructive")}>{value}</dd>
    </div>
  );
}

function CreateActionDialog({
  open,
  onOpenChange,
  caseId,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  caseId?: string;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const cases = useCases();
  const people = useOrgPeople();
  const [selCase, setSelCase] = useState<string>(caseId ?? "");
  const causes = useCaseCauses(selCase || null);
  const [description, setDescription] = useState("");
  const [causeId, setCauseId] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [kind, setKind] = useState<ActionKind>("correctiva");
  const [control, setControl] = useState<ControlType>("administrativo");
  const [due, setDue] = useState("");

  const reset = () => {
    setDescription("");
    setCauseId("");
    setResponsible("");
    setPriority("media");
    setKind("correctiva");
    setControl("administrativo");
    setDue("");
  };

  const create = useMutation({
    mutationFn: async () => {
      const cid = caseId ?? selCase;
      if (!cid) throw new Error("Selecciona el caso");
      if (!causeId) throw new Error("Selecciona la causa asociada");
      if (!responsible) throw new Error("Selecciona un responsable");
      if (!due) throw new Error("Indica la fecha compromiso");
      if (!description.trim()) throw new Error("Describe la acción");

      const { data: c, error: cErr } = await supabase
        .from("cases")
        .select("id, code, organization_id")
        .eq("id", cid)
        .single();
      if (cErr) throw cErr;

      const { data: plan } = await supabase
        .from("action_plans")
        .select("id")
        .eq("case_id", cid)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      let planId = plan?.id;
      if (!planId) {
        const { data: np, error: pErr } = await supabase
          .from("action_plans")
          .insert({
            organization_id: c.organization_id,
            case_id: cid,
            title: `Plan de acción ${c.code ?? ""}`.trim(),
            created_by: userId,
          })
          .select("id")
          .single();
        if (pErr) throw pErr;
        planId = np.id;
      }

      const { error } = await supabase.from("actions").insert({
        action_plan_id: planId,
        description: description.trim(),
        cause_id: causeId,
        responsible_id: responsible,
        priority,
        action_kind: kind,
        control_type: control,
        due_date: due,
        status: "pendiente",
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acción creada");
      void qc.invalidateQueries({ queryKey: ["actions"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva acción</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!caseId && (
            <Field label="Caso">
              <Select value={selCase} onValueChange={(v) => { setSelCase(v); setCauseId(""); }}>
                <SelectTrigger aria-label="Caso"><SelectValue placeholder="Selecciona el caso" /></SelectTrigger>
                <SelectContent>
                  {(cases.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} · {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Causa asociada">
            <Select value={causeId} onValueChange={setCauseId} disabled={!selCase}>
              <SelectTrigger aria-label="Causa asociada"><SelectValue placeholder="Selecciona la causa" /></SelectTrigger>
              <SelectContent>
                {(causes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>[{c.cause_type}] {c.description.slice(0, 80)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selCase && causes.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">Este caso aún no tiene causas en el análisis causal.</p>
            )}
          </Field>
          <Field label="Descripción de la acción">
            <Textarea aria-label="Descripción de la acción" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Responsable">
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger aria-label="Responsable"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {(people.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sin nombre"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fecha compromiso">
              <Input aria-label="Fecha compromiso" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <Field label="Prioridad">
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger aria-label="Prioridad"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de acción">
              <Select value={kind} onValueChange={(v) => setKind(v as ActionKind)}>
                <SelectTrigger aria-label="Tipo de acción"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_KINDS.map((k) => <SelectItem key={k} value={k}>{ACTION_KIND_LABELS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Jerarquía de control">
              <Select value={control} onValueChange={(v) => setControl(v as ControlType)}>
                <SelectTrigger aria-label="Jerarquía de control"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTROL_TYPES.map((k) => <SelectItem key={k} value={k}>{CONTROL_LABELS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear acción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
