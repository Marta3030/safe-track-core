import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, GraduationCap, Loader2, Pencil, Plus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useCases, useCatalogs } from "@/hooks/use-cases";
import { useOrgPeople } from "@/hooks/use-actions";
import { formatDateTime } from "@/lib/cases";
import { EVIDENCE_ACCEPT, EVIDENCE_BUCKET, validateEvidenceFile } from "@/lib/evidences";
import { cn } from "@/lib/utils";

export type TrainingStatus = Database["public"]["Enums"]["training_status"];
export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  planificada: "Programada",
  en_curso: "En curso",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
const STATUS_TONE: Record<TrainingStatus, string> = {
  planificada: "bg-warning/25 text-warning-foreground",
  en_curso: "bg-primary/20 text-foreground",
  realizada: "bg-success/20 text-success",
  cancelada: "bg-muted text-muted-foreground",
};
export const PENDING_TRAINING: TrainingStatus[] = ["planificada", "en_curso"];

type TrainingRow = Database["public"]["Tables"]["trainings"]["Row"] & {
  responsible: { id: string; full_name: string | null } | null;
  cases: { id: string; code: string | null; title: string } | null;
  actions: { id: string; description: string } | null;
  hazards: { id: string; hazard: string; risk: string } | null;
  work_centers: { name: string } | null;
  areas: { name: string } | null;
  organizations: { name: string } | null;
  training_attendees: { id: string; profile_id: string | null; external_name: string | null; attended: boolean; profiles: { full_name: string | null } | null }[];
};

const SELECT =
  "*, responsible:profiles!trainings_responsible_id_fkey(id, full_name), cases(id, code, title), actions(id, description), hazards(id, hazard, risk), work_centers(name), areas(name), organizations(name), training_attendees(id, profile_id, external_name, attended, profiles(full_name))";

export function useTrainings(caseId?: string) {
  return useQuery({
    queryKey: ["trainings", caseId ?? "all"],
    queryFn: async (): Promise<TrainingRow[]> => {
      let q = supabase.from("trainings").select(SELECT).is("deleted_at", null).order("scheduled_at", { ascending: true });
      if (caseId) q = q.eq("source_case_id", caseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TrainingRow[];
    },
  });
}

export type TrainingDefaults = { caseId?: string | null; actionId?: string | null; hazardId?: string | null; title?: string; workCenterId?: string | null; areaId?: string | null };

const ALL = "__all";
const NONE = "__none";

export function TrainingsBoard({ caseId, canManage, userId, orgId }: { caseId?: string; canManage: boolean; userId: string | null; orgId: string | null }) {
  const { data = [], isLoading, isError, error } = useTrainings(caseId);
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TrainingRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = data.filter((t) => (status === ALL || t.status === status) && (!search || `${t.title} ${t.objective ?? ""}`.toLowerCase().includes(search.toLowerCase())));
  const pendingMandatory = data.filter((t) => t.is_mandatory && PENDING_TRAINING.includes(t.status)).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Capacitaciones" value={String(data.length)} icon={GraduationCap} />
        <KpiCard label="Programadas" value={String(data.filter((t) => t.status === "planificada").length)} icon={GraduationCap} />
        <KpiCard label="Realizadas" value={String(data.filter((t) => t.status === "realizada").length)} icon={GraduationCap} />
        <KpiCard label="Obligatorias pendientes" value={String(pendingMandatory)} icon={GraduationCap} />
      </div>
      {caseId && pendingMandatory > 0 && (
        <div className="surface-card border-destructive/40 p-3 text-sm text-destructive">
          Hay {pendingMandatory} capacitación(es) obligatoria(s) pendiente(s). El caso no podrá cerrarse hasta que se realicen o cancelen.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Buscar tema u objetivo" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar capacitación" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {(Object.keys(TRAINING_STATUS_LABELS) as TrainingStatus[]).map((s) => <SelectItem key={s} value={s}>{TRAINING_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button size="sm" className="ml-auto" disabled={!orgId} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nueva capacitación
          </Button>
        )}
      </div>

      {isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : isError ? (
        <div className="surface-card p-4 text-sm text-destructive">{(error as Error).message}</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">No hay capacitaciones registradas.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => <TrainingItem key={t.id} t={t} canManage={canManage} onEdit={() => { setEditing(t); setOpen(true); }} />)}
        </ul>
      )}

      {orgId && (
        <TrainingFormDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} training={editing} orgId={orgId} userId={userId} defaults={{ caseId: caseId ?? null }} />
      )}
    </div>
  );
}

function TrainingItem({ t, canManage, onEdit }: { t: TrainingRow; canManage: boolean; onEdit: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const setStatus = useMutation({
    mutationFn: async (s: TrainingStatus) => {
      const { error } = await supabase.from("trainings").update({ status: s }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Estado actualizado"); void qc.invalidateQueries({ queryKey: ["trainings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const err = validateEvidenceFile(file);
      if (err) throw new Error(err);
      const path = `${t.organization_id}/trainings/${t.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("trainings").update({ evidence_path: path, evidence_name: file.name }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Evidencia cargada"); void qc.invalidateQueries({ queryKey: ["trainings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const openEvidence = async () => {
    if (!t.evidence_path) return;
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(t.evidence_path, 300);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const attended = t.training_attendees.filter((a) => a.attended).length;

  return (
    <li className="surface-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded px-2 py-0.5 text-xs font-medium", STATUS_TONE[t.status])}>{TRAINING_STATUS_LABELS[t.status]}</span>
            {t.is_mandatory && <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">Obligatoria</span>}
          </div>
          <p className="text-sm font-semibold">{t.title}</p>
          {t.objective && <p className="text-xs text-muted-foreground">{t.objective}</p>}
        </div>
        {canManage && <Button size="icon" variant="ghost" aria-label="Editar capacitación" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>}
      </div>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <M l="Fecha" v={formatDateTime(t.scheduled_at)} />
        <M l="Responsable" v={t.responsible?.full_name} />
        <M l="Empresa / centro / área" v={[t.organizations?.name, t.work_centers?.name, t.areas?.name].filter(Boolean).join(" · ")} />
        <M l="Participantes" v={`${t.training_attendees.length} (${attended} asistieron)`} />
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {t.cases && <Link to="/casos/$caseId" params={{ caseId: t.cases.id }} className="underline-offset-2 hover:underline">Caso: {t.cases.code} · {t.cases.title}</Link>}
        {t.actions && <span className="text-muted-foreground">Acción: {t.actions.description}</span>}
        {t.hazards && <span className="text-muted-foreground">Riesgo MIPER: {t.hazards.hazard} → {t.hazards.risk}</span>}
      </div>
      {t.training_attendees.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t.training_attendees.map((a) => `${a.profiles?.full_name ?? a.external_name ?? "—"}${a.attended ? " ✓" : ""}`).join(", ")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {t.evidence_path && <Button size="sm" variant="outline" onClick={() => void openEvidence()}><FileText className="mr-2 h-4 w-4" />{t.evidence_name ?? "Ver evidencia"}</Button>}
        {canManage && (
          <>
            <input ref={fileRef} type="file" accept={EVIDENCE_ACCEPT} className="hidden" aria-label="Cargar evidencia de capacitación" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
            <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Cargar evidencia
            </Button>
            {t.status === "planificada" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate("en_curso")}>Iniciar</Button>}
            {PENDING_TRAINING.includes(t.status) && <Button size="sm" onClick={() => setStatus.mutate("realizada")}>Marcar realizada</Button>}
            {PENDING_TRAINING.includes(t.status) && <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("cancelada")}>Cancelar</Button>}
          </>
        )}
      </div>
    </li>
  );
}

function M({ l, v }: { l: string; v: string | null | undefined }) {
  return <div><dt className="uppercase tracking-wide text-muted-foreground">{l}</dt><dd>{v?.trim() ? v : "—"}</dd></div>;
}

export function TrainingFormDialog({ open, onOpenChange, training, orgId, userId, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; training: TrainingRow | null; orgId: string; userId: string | null; defaults?: TrainingDefaults;
}) {
  const qc = useQueryClient();
  const people = useOrgPeople();
  const cats = useCatalogs();
  const cases = useCases();
  const [title, setTitle] = useState(training?.title ?? defaults?.title ?? "");
  const [objective, setObjective] = useState(training?.objective ?? "");
  const [center, setCenter] = useState(training?.work_center_id ?? defaults?.workCenterId ?? NONE);
  const [area, setArea] = useState(training?.area_id ?? defaults?.areaId ?? NONE);
  const [responsible, setResponsible] = useState(training?.responsible_id ?? NONE);
  const [date, setDate] = useState(training?.scheduled_at ? training.scheduled_at.slice(0, 16) : "");
  const [hours, setHours] = useState(String(training?.duration_hours ?? 1));
  const [status, setStatus] = useState<TrainingStatus>(training?.status ?? "planificada");
  const [mandatory, setMandatory] = useState(training?.is_mandatory ?? true);
  const [caseSel, setCaseSel] = useState(training?.source_case_id ?? defaults?.caseId ?? NONE);
  const actionId = training?.action_id ?? defaults?.actionId ?? null;
  const hazardId = training?.hazard_id ?? defaults?.hazardId ?? null;
  const [participants, setParticipants] = useState<{ profile_id: string | null; external_name: string | null; attended: boolean }[]>(
    training?.training_attendees.map((a) => ({ profile_id: a.profile_id, external_name: a.external_name, attended: a.attended })) ?? [],
  );
  const [external, setExternal] = useState("");

  const centers = (cats.data?.workCenters ?? []).filter((c) => c.organization_id === orgId);
  const areas = (cats.data?.areas ?? []).filter((a) => a.work_center_id === center);
  const orgName = cats.data?.organizations.find((o) => o.id === orgId)?.name ?? "—";

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Indica el tema");
      if (!date) throw new Error("Indica la fecha");
      const payload = {
        title: title.trim(), objective: objective.trim() || null,
        work_center_id: center === NONE ? null : center, area_id: area === NONE ? null : area,
        responsible_id: responsible === NONE ? null : responsible,
        scheduled_at: new Date(date).toISOString(), duration_hours: Number(hours) || 1,
        status, is_mandatory: mandatory, source_case_id: caseSel === NONE ? null : caseSel,
        action_id: actionId, hazard_id: hazardId,
      };
      let id = training?.id;
      if (id) {
        const { error } = await supabase.from("trainings").update(payload).eq("id", id);
        if (error) throw error;
        const { error: dErr } = await supabase.from("training_attendees").delete().eq("training_id", id);
        if (dErr) throw dErr;
      } else {
        const { data, error } = await supabase.from("trainings").insert({ ...payload, organization_id: orgId, created_by: userId }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (participants.length) {
        const { error } = await supabase.from("training_attendees").insert(participants.map((p) => ({ ...p, training_id: id!, created_by: userId })));
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Capacitación guardada"); void qc.invalidateQueries({ queryKey: ["trainings"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = (people.data ?? []).filter((p) => !participants.some((x) => x.profile_id === p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{training ? "Editar capacitación" : "Nueva capacitación"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(actionId || hazardId) && (
            <p className="rounded bg-muted p-2 text-xs text-muted-foreground">
              Necesidad generada desde {actionId ? "una acción del plan" : "una actualización MIPER"}.
            </p>
          )}
          <F label="Tema"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></F>
          <F label="Objetivo"><Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} /></F>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <F label="Empresa"><Input value={orgName} disabled /></F>
            <F label="Centro">
              <Select value={center} onValueChange={(v) => { setCenter(v); setArea(NONE); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Sin centro</SelectItem>{centers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Área">
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Sin área</SelectItem>{areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <F label="Responsable">
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Sin asignar</SelectItem>{(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "—"}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Fecha"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></F>
            <F label="Duración (h)"><Input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} /></F>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <F label="Estado">
              <Select value={status} onValueChange={(v) => setStatus(v as TrainingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TRAINING_STATUS_LABELS) as TrainingStatus[]).map((s) => <SelectItem key={s} value={s}>{TRAINING_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Caso relacionado">
              <Select value={caseSel} onValueChange={setCaseSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>Sin caso</SelectItem>{(cases.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.title}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={mandatory} onCheckedChange={(v) => setMandatory(v === true)} /> Obligatoria (bloquea el cierre del caso mientras esté pendiente)
          </label>
          <div className="space-y-2">
            <Label>Participantes</Label>
            <div className="flex flex-wrap gap-2">
              <Select value="" onValueChange={(v) => setParticipants((s) => [...s, { profile_id: v, external_name: null, attended: false }])}>
                <SelectTrigger className="w-56" aria-label="Agregar trabajador"><SelectValue placeholder="Agregar trabajador" /></SelectTrigger>
                <SelectContent>{available.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "—"}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="w-48" placeholder="Nombre externo" value={external} onChange={(e) => setExternal(e.target.value)} />
              <Button type="button" size="sm" variant="outline" disabled={!external.trim()} onClick={() => { setParticipants((s) => [...s, { profile_id: null, external_name: external.trim(), attended: false }]); setExternal(""); }}>Agregar</Button>
            </div>
            <ul className="space-y-1">
              {participants.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={p.attended} aria-label="Asistió" onCheckedChange={(v) => setParticipants((s) => s.map((x, j) => (j === i ? { ...x, attended: v === true } : x)))} />
                  <span className="flex-1">{p.profile_id ? people.data?.find((x) => x.id === p.profile_id)?.full_name : p.external_name}</span>
                  <Button size="icon" variant="ghost" aria-label="Quitar participante" onClick={() => setParticipants((s) => s.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
