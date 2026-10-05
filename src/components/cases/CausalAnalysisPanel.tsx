import { useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, History, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useInvestigation, investigationQueryKey } from "@/hooks/use-investigation";
import { formatDateTime } from "@/lib/cases";
import { AiCausalAssistant } from "./AiCausalAssistant";

type CauseType = Database["public"]["Enums"]["cause_type"];
type CauseRow = Database["public"]["Tables"]["investigation_causes"]["Row"];
type WhyRow = Database["public"]["Tables"]["investigation_why_analyses"]["Row"];
type HistoryRow = Database["public"]["Tables"]["causal_analysis_history"]["Row"];

const CAUSE_TYPES: { value: CauseType; label: string; hint: string }[] = [
  { value: "inmediata", label: "Causas inmediatas", hint: "Actos y condiciones subestándar" },
  { value: "basica", label: "Causas básicas", hint: "Factores personales y del trabajo" },
  { value: "organizacional", label: "Causas organizacionales", hint: "Gestión, liderazgo, sistemas" },
  { value: "raiz", label: "Causas raíz", hint: "Origen fundamental identificado por el profesional" },
];
const TYPE_LABEL = Object.fromEntries(CAUSE_TYPES.map((t) => [t.value, t.label])) as Record<CauseType, string>;

type Props = { caseId: string; canManage: boolean; userId: string | null };

export function CausalAnalysisPanel({ caseId, canManage, userId }: Props) {
  const { data: investigation, isLoading } = useInvestigation(caseId);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!investigation) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Primero inicia la investigación en la pestaña "Investigación" para registrar el análisis causal.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <CausesSection invId={investigation.id} canManage={canManage} userId={userId} />
      {canManage && <AiSection investigation={investigation} />}
      <WhysSection invId={investigation.id} canManage={canManage} userId={userId} />
      <ConclusionSection
        caseId={caseId}
        invId={investigation.id}
        conclusion={investigation.root_cause_conclusion}
        confirmedAt={investigation.root_cause_confirmed_at}
        canManage={canManage}
        userId={userId}
      />
      <HistorySection invId={investigation.id} />
    </div>
  );
}

function AiSection({ investigation }: { investigation: NonNullable<ReturnType<typeof useInvestigation>["data"]> }) {
  const { data: causes = [] } = useCauses(investigation.id);
  return <AiCausalAssistant investigation={investigation} causes={causes} />;
}

const causesKey = (id: string) => ["causes", id] as const;
const whysKey = (id: string) => ["whys", id] as const;
const historyKey = (id: string) => ["causal-history", id] as const;

function useCauses(invId: string) {
  return useQuery({
    queryKey: causesKey(invId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigation_causes")
        .select("*, actions(id)")
        .eq("investigation_id", invId)
        .order("created_at");
      if (error) throw error;
      return data as (CauseRow & { actions: { id: string }[] })[];
    },
  });
}

function useWhys(invId: string) {
  return useQuery({
    queryKey: whysKey(invId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigation_why_analyses")
        .select("*")
        .eq("investigation_id", invId)
        .order("created_at");
      if (error) throw error;
      return data as WhyRow[];
    },
  });
}

function CausesSection({ invId, canManage, userId }: { invId: string; canManage: boolean; userId: string | null }) {
  const qc = useQueryClient();
  const { data: causes = [], isLoading } = useCauses(invId);
  const { data: whys = [] } = useWhys(invId);
  const [type, setType] = useState<CauseType>("inmediata");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requiresAction, setRequiresAction] = useState(true);
  const [whyId, setWhyId] = useState<string>("none");
  const descId = useId();

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: causesKey(invId) });
    void qc.invalidateQueries({ queryKey: historyKey(invId) });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("investigation_causes").insert({
        investigation_id: invId,
        cause_type: type,
        category: category.trim() || null,
        description: description.trim(),
        requires_action: requiresAction,
        why_analysis_id: whyId === "none" ? null : whyId,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Causa registrada");
      setCategory("");
      setDescription("");
      setWhyId("none");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: async (p: { id: string; requires_action: boolean }) => {
      const { error } = await supabase
        .from("investigation_causes")
        .update({ requires_action: p.requires_action })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investigation_causes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Causa eliminada (queda en el historial)");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">Causas identificadas</h3>
        <p className="text-xs text-muted-foreground">
          Registra todas las causas que correspondan. Marca las que requerirán acciones en el plan de acción.
        </p>
      </div>

      {canManage && (
        <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipo de causa</Label>
            <Select value={type} onValueChange={(v) => setType(v as CauseType)}>
              <SelectTrigger aria-label="Tipo de causa"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAUSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${descId}-cat`}>Categoría (opcional)</Label>
            <Input id={`${descId}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej.: Acto subestándar, Supervisión" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor={descId}>Descripción de la causa</Label>
            <Textarea id={descId} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Origen 5 Porqués (opcional)</Label>
            <Select value={whyId} onValueChange={setWhyId}>
              <SelectTrigger aria-label="Origen 5 Porqués"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin vincular</SelectItem>
                {whys.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.problem.slice(0, 60)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <Checkbox checked={requiresAction} onCheckedChange={(v) => setRequiresAction(v === true)} />
            Requiere acción en el plan de acción
          </label>
          <div className="md:col-span-2">
            <Button size="sm" disabled={!description.trim() || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar causa
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {CAUSE_TYPES.map((t) => {
            const items = causes.filter((c) => c.cause_type === t.value);
            return (
              <div key={t.value} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{t.label} <span className="text-muted-foreground">({items.length})</span></p>
                <p className="mb-2 text-xs text-muted-foreground">{t.hint}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin causas registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((c) => (
                      <li key={c.id} className="rounded-md bg-muted/50 p-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {c.category && <p className="text-xs font-medium text-muted-foreground">{c.category}</p>}
                            <p>{c.description}</p>
                          </div>
                          {canManage && (
                            <Button size="icon" variant="ghost" aria-label="Eliminar causa" onClick={() => remove.mutate(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1.5">
                            <Checkbox
                              checked={c.requires_action}
                              disabled={!canManage}
                              onCheckedChange={(v) => patch.mutate({ id: c.id, requires_action: v === true })}
                            />
                            Requiere acción
                          </label>
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {c.actions.length} acción(es) vinculada(s)
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WhysSection({ invId, canManage, userId }: { invId: string; canManage: boolean; userId: string | null }) {
  const qc = useQueryClient();
  const { data: whys = [] } = useWhys(invId);
  const [problem, setProblem] = useState("");
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const pid = useId();

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: whysKey(invId) });
    void qc.invalidateQueries({ queryKey: historyKey(invId) });
  };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("investigation_why_analyses").insert({
        investigation_id: invId,
        problem: problem.trim(),
        whys: answers.map((a) => a.trim()).filter(Boolean),
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Análisis 5 Porqués guardado");
      setProblem("");
      setAnswers(["", "", "", "", ""]);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investigation_why_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">Metodología 5 Porqués</h3>
        <p className="text-xs text-muted-foreground">
          Herramienta de apoyo. El último porqué no se convierte automáticamente en causa raíz: el profesional decide cuál registrar.
        </p>
      </div>

      {canManage && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor={pid}>Problema / efecto</Label>
            <Input id={pid} value={problem} onChange={(e) => setProblem(e.target.value)} />
          </div>
          {answers.map((a, i) => (
            <div key={i} className="space-y-1">
              <Label htmlFor={`${pid}-${i}`}>¿Por qué? {i + 1}</Label>
              <Input
                id={`${pid}-${i}`}
                value={a}
                onChange={(e) => setAnswers((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </div>
          ))}
          <Button size="sm" disabled={!problem.trim() || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Guardar análisis 5 Porqués
          </Button>
        </div>
      )}

      {whys.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin análisis registrados.</p>
      ) : (
        <ul className="space-y-3">
          {whys.map((w) => (
            <li key={w.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{w.problem}</p>
                {canManage && (
                  <Button size="icon" variant="ghost" aria-label="Eliminar análisis" onClick={() => remove.mutate(w.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <ol className="mt-2 space-y-1 pl-4 text-muted-foreground">
                {(Array.isArray(w.whys) ? (w.whys as string[]) : []).map((x, i) => (
                  <li key={i} className="list-decimal">{x}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConclusionSection({
  caseId, invId, conclusion, confirmedAt, canManage, userId,
}: {
  caseId: string; invId: string; conclusion: string | null; confirmedAt: string | null; canManage: boolean; userId: string | null;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState(conclusion ?? "");
  const id = useId();
  useEffect(() => setText(conclusion ?? ""), [conclusion]);
  const dirty = text.trim() !== (conclusion ?? "").trim();

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("investigations")
        .update({
          root_cause_conclusion: text.trim(),
          root_cause_confirmed_by: userId,
          root_cause_confirmed_at: new Date().toISOString(),
        })
        .eq("id", invId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conclusión confirmada y guardada");
      void qc.invalidateQueries({ queryKey: investigationQueryKey(caseId) });
      void qc.invalidateQueries({ queryKey: historyKey(invId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface-card space-y-3 p-5">
      <div>
        <h3 className="text-sm font-semibold">Conclusión de causa raíz</h3>
        <p className="text-xs text-muted-foreground">
          La plataforma no determina la causa raíz. Redacta la conclusión y confírmala como profesional responsable.
        </p>
      </div>
      <Label htmlFor={id} className="sr-only">Conclusión de causa raíz</Label>
      <Textarea id={id} rows={4} value={text} disabled={!canManage} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Button size="sm" disabled={!text.trim() || !dirty && !!confirmedAt || confirm.isPending} onClick={() => confirm.mutate()}>
            {confirm.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Confirmar y guardar conclusión
          </Button>
        )}
        {confirmedAt && !dirty && (
          <span className="text-xs text-muted-foreground">Confirmada el {formatDateTime(confirmedAt)}</span>
        )}
        {dirty && <span className="text-xs text-destructive">Cambios sin confirmar</span>}
      </div>
    </section>
  );
}

function describe(h: HistoryRow): string {
  const op = h.operation === "INSERT" ? "Creó" : h.operation === "DELETE" ? "Eliminó" : "Modificó";
  const data = (h.new_data ?? h.old_data) as Record<string, unknown> | null;
  if (h.entity === "conclusion") return "Confirmó la conclusión de causa raíz";
  if (h.entity === "five_whys") return `${op} análisis 5 Porqués: ${String(data?.['problem'] ?? "")}`;
  const t = TYPE_LABEL[data?.['cause_type'] as CauseType] ?? "causa";
  return `${op} ${t.toLowerCase().replace(/s$/, "").replace(/es$/, "")}: ${String(data?.['description'] ?? "")}`;
}

function HistorySection({ invId }: { invId: string }) {
  const { data = [] } = useQuery({
    queryKey: historyKey(invId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("causal_analysis_history")
        .select("*")
        .eq("investigation_id", invId)
        .order("changed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as HistoryRow[];
    },
  });
  const userIds = useMemo(() => [...new Set(data.map((d) => d.changed_by).filter(Boolean))] as string[], [data]);
  const { data: names = {} } = useQuery({
    queryKey: ["profile-names", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name ?? "Usuario"])) as Record<string, string>;
    },
  });

  return (
    <section className="surface-card space-y-3 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Historial de modificaciones</h3>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {data.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-x-2 border-b pb-1.5 last:border-0">
              <span className="text-xs text-muted-foreground">{formatDateTime(h.changed_at)}</span>
              <span className="text-xs font-medium">{h.changed_by ? names[h.changed_by] ?? "Usuario" : "Sistema"}</span>
              <span className="w-full">{describe(h)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
