import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Grid3x3, History, Loader2, Pencil, Plus, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useCases } from "@/hooks/use-cases";
import { useOrgPeople } from "@/hooks/use-actions";
import { formatDate, formatDateTime } from "@/lib/cases";
import { cn } from "@/lib/utils";
import {
  LEVEL_TONE,
  RISK_LEVELS,
  classify,
  useHazardReviews,
  useHazards,
  useMatrices,
  type HazardRow,
  type MatrixLevel,
  type RiskLevel,
  type RiskMatrix,
} from "@/lib/miper";

const ALL = "__all";
const NONE = "__none";

type Props = { caseId?: string; canManage: boolean; userId: string | null; orgId: string | null };

export function MiperBoard({ caseId, canManage, userId, orgId }: Props) {
  const matrices = useMatrices();
  const { data = [], isLoading, isError, error } = useHazards(caseId);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState(ALL);
  const [editing, setEditing] = useState<HazardRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<HazardRow | null>(null);

  const matrix = matrices.data?.find((m) => m.is_default) ?? matrices.data?.[0];
  const matrixById = (id: string | null) => matrices.data?.find((m) => m.id === id) ?? matrix;

  const filtered = data.filter((h) => {
    const t = `${h.process ?? ""} ${h.activity} ${h.task ?? ""} ${h.hazard} ${h.risk}`.toLowerCase();
    return (!search || t.includes(search.toLowerCase())) && (level === ALL || h.risk_level === level);
  });

  const now = Date.now();
  const critical = data.filter((h) => h.risk_level === "critico" || h.risk_level === "alto").length;
  const reviewDue = data.filter((h) => h.next_review_at && new Date(h.next_review_at).getTime() < now).length;
  const reduced = data.filter((h) => {
    const after = h.post_probability && h.post_consequence ? h.post_probability * h.post_consequence : null;
    return after !== null && after < h.probability * h.consequence;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Peligros evaluados" value={String(data.length)} icon={Grid3x3} />
        <KpiCard label="Riesgo alto/crítico" value={String(critical)} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Riesgo reducido" value={String(reduced)} icon={ShieldCheck} tone="success" hint="Evaluación posterior menor" />
        <KpiCard label="Revisión vencida" value={String(reviewDue)} icon={History} tone="warning" />
      </div>

      {matrix && <Heatmap matrix={matrix} hazards={data} />}

      <div className="surface-card grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
        <Input aria-label="Buscar en MIPER" placeholder="Buscar proceso, actividad, peligro…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:col-span-2" />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger aria-label="Nivel de riesgo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Nivel: todos</SelectItem>
            {(matrix?.levels ?? []).map((l) => <SelectItem key={l.level} value={l.level}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{filtered.length} fila(s) · Metodología: {matrix?.name ?? "—"}</p>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)} disabled={!orgId}>
              <Settings2 className="mr-2 h-4 w-4" /> Configurar matriz
            </Button>
            <Button size="sm" disabled={!matrix} onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo peligro
            </Button>
          </div>
        )}
      </div>

      {isLoading || matrices.isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : isError ? (
        <div className="surface-card p-4 text-sm text-destructive">{(error as Error).message}</div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">No hay filas MIPER registradas.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((h) => {
            const m = matrixById(h.matrix_id);
            return (
              <li key={h.id} className="surface-card space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {[h.process, h.activity, h.task].filter(Boolean).join(" › ")} {h.is_routine ? "· Rutinaria" : "· No rutinaria"}
                    </p>
                    <p className="text-sm font-medium">{h.hazard} → {h.risk}</p>
                    {h.cases && !caseId && (
                      <Link to="/casos/$caseId" params={{ caseId: h.cases.id }} className="font-mono text-xs text-muted-foreground underline-offset-2 hover:underline">
                        Accidente relacionado: {h.cases.code} · {h.cases.title}
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Historial de revisiones" onClick={() => setHistoryFor(h)}><History className="h-4 w-4" /></Button>
                    {canManage && (
                      <Button size="icon" variant="ghost" aria-label="Editar o revisar" onClick={() => { setEditing(h); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <EvalBox title="Evaluación previa" m={m} p={h.probability} c={h.consequence} />
                  <EvalBox title="Evaluación posterior" m={m} p={h.post_probability} c={h.post_consequence} base={h.probability * h.consequence} />
                  <EvalBox title="Riesgo residual" m={m} p={h.residual_probability} c={h.residual_consequence} base={h.probability * h.consequence} />
                </div>

                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <Meta label="Controles existentes" value={h.existing_controls} />
                  <Meta label="Medidas" value={h.proposed_controls} />
                  <Meta label="Responsable" value={h.owner?.full_name} />
                  <Meta label="Revisión" value={`${h.last_reviewed_at ? `Última ${formatDate(h.last_reviewed_at)}` : "Sin revisión"}${h.next_review_at ? ` · Próxima ${formatDate(h.next_review_at)}` : ""}`} />
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      {matrix && (
        <HazardFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          hazard={editing}
          matrix={matrixById(editing?.matrix_id ?? null)!}
          caseId={caseId}
          orgId={orgId}
          userId={userId}
        />
      )}
      {orgId && <MatrixConfigDialog open={configOpen} onOpenChange={setConfigOpen} matrix={matrix} orgId={orgId} userId={userId} />}
      <ReviewHistoryDialog hazard={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line font-medium">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function EvalBox({ title, m, p, c, base }: { title: string; m: RiskMatrix | undefined; p: number | null; c: number | null; base?: number }) {
  const r = classify(m, p, c);
  const delta = r && base !== undefined ? r.score - base : null;
  return (
    <div className={cn("rounded-md p-2 text-xs", r ? LEVEL_TONE[r.level] : "bg-muted text-muted-foreground")}>
      <p className="font-medium">{title}</p>
      {r ? (
        <p>
          P{p} × C{c} = <strong>{r.score}</strong> · {r.label}
          {delta !== null && delta !== 0 && <span> ({delta > 0 ? "+" : ""}{delta})</span>}
        </p>
      ) : (
        <p>Sin evaluar</p>
      )}
    </div>
  );
}

function Heatmap({ matrix, hazards }: { matrix: RiskMatrix; hazards: HazardRow[] }) {
  const np = matrix.probability_labels.length;
  const nc = matrix.consequence_labels.length;
  const count = (p: number, c: number) => hazards.filter((h) => h.probability === p && h.consequence === c).length;
  return (
    <div className="surface-card overflow-x-auto p-4">
      <p className="eyebrow mb-2">{matrix.name} · {np}×{nc} (evaluación previa)</p>
      <table className="w-full min-w-[480px] border-separate border-spacing-1 text-center text-xs">
        <tbody>
          {Array.from({ length: np }, (_, i) => np - i).map((p) => (
            <tr key={p}>
              <th className="w-28 text-right font-normal text-muted-foreground">{p} · {matrix.probability_labels[p - 1]}</th>
              {Array.from({ length: nc }, (_, j) => j + 1).map((c) => {
                const r = classify(matrix, p, c);
                const n = count(p, c);
                return (
                  <td key={c} title={r?.label} className={cn("h-10 rounded", r ? LEVEL_TONE[r.level] : "bg-muted")}>
                    <span className="font-semibold">{n || ""}</span>
                    <span className="block text-[10px] opacity-70">{p * c}</span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th />
            {matrix.consequence_labels.map((l, j) => (
              <th key={l} className="font-normal text-muted-foreground">{j + 1} · {l}</th>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {matrix.levels.map((l) => (
          <span key={l.level} className={cn("rounded-full px-2 py-0.5", LEVEL_TONE[l.level])}>{l.label}: {l.min}–{l.max}</span>
        ))}
      </div>
    </div>
  );
}

function ScaleSelect({ label, value, onChange, labels, optional }: { label: string; value: number | null; onChange: (v: number | null) => void; labels: string[]; optional?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value ? String(value) : NONE} onValueChange={(v) => onChange(v === NONE ? null : Number(v))}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>Sin evaluar</SelectItem>}
          {labels.map((l, i) => <SelectItem key={l + i} value={String(i + 1)}>{i + 1} · {l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function HazardFormDialog({ open, onOpenChange, hazard, matrix, caseId, orgId, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; hazard: HazardRow | null; matrix: RiskMatrix;
  caseId?: string; orgId: string | null; userId: string | null;
}) {
  const qc = useQueryClient();
  const cases = useCases();
  const people = useOrgPeople();
  const h = hazard;
  const [f, setF] = useState({
    process: h?.process ?? "", activity: h?.activity ?? "", task: h?.task ?? "", is_routine: h?.is_routine ?? true,
    hazard: h?.hazard ?? "", risk: h?.risk ?? "", existing_controls: h?.existing_controls ?? "",
    proposed_controls: h?.proposed_controls ?? "", legal_requirements: h?.legal_requirements ?? "",
    owner_id: h?.owner_id ?? "", source_case_id: h?.source_case_id ?? caseId ?? "",
    next_review_at: h?.next_review_at?.slice(0, 10) ?? "", review_reason: "",
  });
  const [ev, setEv] = useState({
    p: h?.probability ?? null as number | null, c: h?.consequence ?? null as number | null,
    pp: h?.post_probability ?? null, pc: h?.post_consequence ?? null,
    rp: h?.residual_probability ?? null, rc: h?.residual_consequence ?? null,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sin organización");
      if (!f.activity.trim() || !f.hazard.trim() || !f.risk.trim()) throw new Error("Actividad, peligro y riesgo son obligatorios");
      if (!ev.p || !ev.c) throw new Error("Indica probabilidad y consecuencia de la evaluación previa");
      if (h && !f.review_reason.trim()) throw new Error("Indica el motivo de la revisión");
      const payload = {
        process: f.process || null, activity: f.activity.trim(), task: f.task || null, is_routine: f.is_routine,
        hazard: f.hazard.trim(), risk: f.risk.trim(), existing_controls: f.existing_controls || null,
        proposed_controls: f.proposed_controls || null, legal_requirements: f.legal_requirements || null,
        owner_id: f.owner_id || null, source_case_id: f.source_case_id || null,
        next_review_at: f.next_review_at ? new Date(`${f.next_review_at}T12:00:00`).toISOString() : null,
        probability: ev.p, consequence: ev.c,
        post_probability: ev.pp, post_consequence: ev.pc,
        residual_probability: ev.rp, residual_consequence: ev.rc,
        matrix_id: matrix.id, last_reviewed_at: new Date().toISOString(),
        review_reason: h ? f.review_reason.trim() : "Creación de la fila MIPER",
      };
      const { error } = h
        ? await supabase.from("hazards").update(payload).eq("id", h.id)
        : await supabase.from("hazards").insert({ ...payload, organization_id: orgId, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(h ? "Revisión registrada" : "Peligro registrado");
      void qc.invalidateQueries({ queryKey: ["hazards"] });
      void qc.invalidateQueries({ queryKey: ["hazard-reviews"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const text = (k: keyof typeof f, label: string, area = false) => (
    <div className="space-y-1">
      <Label htmlFor={`hz-${k}`} className="text-xs">{label}</Label>
      {area ? (
        <Textarea id={`hz-${k}`} rows={2} value={f[k] as string} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <Input id={`hz-${k}`} value={f[k] as string} onChange={(e) => set(k, e.target.value)} />
      )}
    </div>
  );
  const P = matrix.probability_labels, C = matrix.consequence_labels;
  const evalRow = (title: string, pk: "p" | "pp" | "rp", ck: "c" | "pc" | "rc", optional: boolean) => {
    const r = classify(matrix, ev[pk], ev[ck]);
    return (
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          {r && <span className={cn("rounded-full px-2 py-0.5 text-xs", LEVEL_TONE[r.level])}>{r.score} · {r.label}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ScaleSelect label="Probabilidad" value={ev[pk]} onChange={(v) => setEv((s) => ({ ...s, [pk]: v }))} labels={P} optional={optional} />
          <ScaleSelect label="Consecuencia" value={ev[ck]} onChange={(v) => setEv((s) => ({ ...s, [ck]: v }))} labels={C} optional={optional} />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{h ? "Revisar fila MIPER" : "Nuevo peligro"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {text("process", "Proceso")}
            {text("activity", "Actividad *")}
            {text("task", "Tarea")}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.is_routine} onCheckedChange={(v) => set("is_routine", v === true)} /> Actividad rutinaria
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {text("hazard", "Peligro *")}
            {text("risk", "Riesgo *")}
          </div>
          {text("existing_controls", "Controles existentes", true)}
          {evalRow("Evaluación previa *", "p", "c", false)}
          {text("proposed_controls", "Medidas de control", true)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {evalRow("Evaluación posterior", "pp", "pc", true)}
            {evalRow("Riesgo residual", "rp", "rc", true)}
          </div>
          {text("legal_requirements", "Requisitos legales", true)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Responsable</Label>
              <Select value={f.owner_id || NONE} onValueChange={(v) => set("owner_id", v === NONE ? "" : v)}>
                <SelectTrigger aria-label="Responsable"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin responsable</SelectItem>
                  {(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sin nombre"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Accidente relacionado</Label>
              <Select value={f.source_case_id || NONE} onValueChange={(v) => set("source_case_id", v === NONE ? "" : v)} disabled={Boolean(caseId)}>
                <SelectTrigger aria-label="Accidente relacionado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguno</SelectItem>
                  {(cases.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="hz-next" className="text-xs">Próxima revisión</Label>
              <Input id="hz-next" type="date" value={f.next_review_at} onChange={(e) => set("next_review_at", e.target.value)} />
            </div>
          </div>
          {h && text("review_reason", "Motivo de la revisión *", true)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{h ? "Guardar revisión" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatrixConfigDialog({ open, onOpenChange, matrix, orgId, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; matrix: RiskMatrix | undefined; orgId: string; userId: string | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(matrix?.name ?? "Matriz de riesgo");
  const [pl, setPl] = useState((matrix?.probability_labels ?? ["1", "2", "3", "4", "5"]).join("\n"));
  const [cl, setCl] = useState((matrix?.consequence_labels ?? ["1", "2", "3", "4", "5"]).join("\n"));
  const [levels, setLevels] = useState<MatrixLevel[]>(matrix?.levels ?? []);
  const [loadedId, setLoadedId] = useState(matrix?.id);
  if (matrix && matrix.id !== loadedId) {
    setLoadedId(matrix.id); setName(matrix.name);
    setPl(matrix.probability_labels.join("\n")); setCl(matrix.consequence_labels.join("\n")); setLevels(matrix.levels);
  }
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const maxScore = lines(pl).length * lines(cl).length;

  const save = useMutation({
    mutationFn: async () => {
      const P = lines(pl), C = lines(cl);
      if (P.length < 2 || C.length < 2 || P.length > 10 || C.length > 10) throw new Error("Usa entre 2 y 10 niveles por eje");
      const sorted = [...levels].sort((a, b) => a.min - b.min);
      let next = 1;
      for (const l of sorted) {
        if (!l.label.trim() || l.min !== next || l.max < l.min) throw new Error("Los rangos deben ser continuos, sin huecos ni traslapes, desde 1");
        next = l.max + 1;
      }
      if (next - 1 !== P.length * C.length) throw new Error(`Los rangos deben cubrir hasta ${P.length * C.length}`);
      const payload = { name: name.trim() || "Matriz", probability_labels: P, consequence_labels: C, levels: sorted };
      const { error } = matrix
        ? await supabase.from("risk_matrices").update(payload).eq("id", matrix.id)
        : await supabase.from("risk_matrices").insert({ ...payload, organization_id: orgId, is_default: true, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Matriz guardada · los nuevos cálculos usarán esta configuración");
      void qc.invalidateQueries({ queryKey: ["risk-matrices"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Configurar metodología</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="mx-name">Nombre</Label>
            <Input id="mx-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mx-p">Probabilidad (uno por línea, de menor a mayor)</Label>
              <Textarea id="mx-p" rows={6} value={pl} onChange={(e) => setPl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mx-c">Consecuencia (uno por línea)</Label>
              <Textarea id="mx-c" rows={6} value={cl} onChange={(e) => setCl(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Niveles de riesgo (puntaje 1 a {maxScore})</p>
            {levels.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_70px_70px_auto] items-center gap-2">
                <Select value={l.level} onValueChange={(v) => setLevels((s) => s.map((x, j) => (j === i ? { ...x, level: v as RiskLevel } : x)))}>
                  <SelectTrigger aria-label="Categoría"><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label="Etiqueta" value={l.label} onChange={(e) => setLevels((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input aria-label="Mínimo" type="number" value={l.min} onChange={(e) => setLevels((s) => s.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)))} />
                <Input aria-label="Máximo" type="number" value={l.max} onChange={(e) => setLevels((s) => s.map((x, j) => (j === i ? { ...x, max: Number(e.target.value) } : x)))} />
                <Button size="icon" variant="ghost" aria-label="Quitar nivel" onClick={() => setLevels((s) => s.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setLevels((s) => [...s, { level: "medio", label: "Nuevo nivel", min: (s.at(-1)?.max ?? 0) + 1, max: maxScore }])}>
              <Plus className="mr-2 h-4 w-4" /> Agregar nivel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Cambiar la matriz no altera el historial: cada revisión guarda la evaluación tal como estaba.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar matriz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TRACKED: [string, string][] = [
  ["probability", "Probabilidad"], ["consequence", "Consecuencia"], ["risk_level_label", "Nivel previo"],
  ["post_probability", "Prob. posterior"], ["post_consequence", "Cons. posterior"], ["post_risk_level_label", "Nivel posterior"],
  ["residual_probability", "Prob. residual"], ["residual_consequence", "Cons. residual"], ["residual_risk_level_label", "Nivel residual"],
  ["hazard", "Peligro"], ["risk", "Riesgo"], ["existing_controls", "Controles"], ["proposed_controls", "Medidas"],
  ["owner_id", "Responsable"], ["next_review_at", "Próxima revisión"], ["source_case_id", "Accidente"],
];

function ReviewHistoryDialog({ hazard, onClose }: { hazard: HazardRow | null; onClose: () => void }) {
  const q = useHazardReviews(hazard?.id ?? null);
  const people = useOrgPeople();
  const name = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p.full_name ?? "—"])), [people.data]);
  return (
    <Dialog open={Boolean(hazard)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Historial de revisiones</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{hazard?.hazard} → {hazard?.risk}</p>
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <ol className="space-y-2">
            {(q.data ?? []).map((r) => {
              const o = (r.old_data ?? {}) as Record<string, unknown>;
              const n = (r.new_data ?? {}) as Record<string, unknown>;
              const changes = r.operation === "UPDATE" ? TRACKED.filter(([k]) => String(o[k] ?? "") !== String(n[k] ?? "")) : [];
              return (
                <li key={r.id} className="space-y-1 rounded-md border p-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{r.operation === "INSERT" ? "Creación" : "Revisión"}</span>
                    <span className="text-muted-foreground">{formatDateTime(r.changed_at)} · {r.changed_by ? name.get(r.changed_by) ?? "—" : "—"}</span>
                  </div>
                  {r.reason && <p>Motivo: {r.reason}</p>}
                  {r.operation === "INSERT" && <p>Nivel inicial: {String(n.risk_level_label ?? "—")} ({String(n.probability)}×{String(n.consequence)})</p>}
                  {changes.map(([k, l]) => (
                    <p key={k} className="text-muted-foreground">{l}: {String(o[k] ?? "—")} → <span className="text-foreground">{String(n[k] ?? "—")}</span></p>
                  ))}
                  {r.operation === "UPDATE" && changes.length === 0 && <p className="text-muted-foreground">Revisión sin cambios en la evaluación.</p>}
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
