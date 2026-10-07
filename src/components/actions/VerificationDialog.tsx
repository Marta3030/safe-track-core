import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgPeople } from "@/hooks/use-actions";
import { ACTION_STATUS_LABELS, type ActionStatus } from "@/lib/actions";
import { formatDate } from "@/lib/cases";
import { cn } from "@/lib/utils";

export type VerificationResult = "eficaz" | "parcialmente_eficaz" | "no_eficaz";
export const RESULT_LABELS: Record<VerificationResult, string> = {
  eficaz: "Eficaz",
  parcialmente_eficaz: "Parcialmente eficaz",
  no_eficaz: "No eficaz",
};
const RESULT_TONE: Record<VerificationResult, string> = {
  eficaz: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  parcialmente_eficaz: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  no_eficaz: "bg-destructive/15 text-destructive",
};

const CHECKS = [
  ["implemented", "Acción implementada"],
  ["evidence", "Evidencia revisada"],
  ["control", "Control correctamente implementado"],
  ["risk", "Riesgo controlado"],
] as const;
type CheckKey = (typeof CHECKS)[number][0];

export function VerificationDialog({
  open,
  onOpenChange,
  actionId,
  actionDescription,
  defaultResponsible,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actionId: string;
  actionDescription: string;
  defaultResponsible: string | null;
}) {
  const qc = useQueryClient();
  const people = useOrgPeople();
  const today = new Date().toISOString().slice(0, 10);
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({ implemented: false, evidence: false, control: false, risk: false });
  const [result, setResult] = useState<VerificationResult | "">("");
  const [obs, setObs] = useState("");
  const [date, setDate] = useState(today);
  const [createNew, setCreateNew] = useState(true);
  const [newDesc, setNewDesc] = useState("");
  const [newResp, setNewResp] = useState(defaultResponsible ?? "");
  const [newDue, setNewDue] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("Selecciona el resultado");
      if (result !== "eficaz" && !obs.trim()) throw new Error("Las observaciones son obligatorias si no es eficaz");
      const linked = result === "no_eficaz" && createNew;
      if (linked && (!newDesc.trim() || !newDue)) throw new Error("Completa la nueva acción vinculada");
      const { error } = await supabase.rpc("verify_action", {
        _action_id: actionId,
        _action_implemented: checks.implemented,
        _evidence_reviewed: checks.evidence,
        _control_implemented: checks.control,
        _risk_controlled: checks.risk,
        _result: result,
        _observations: obs,
        _verified_on: date,
        ...(linked ? { _new_description: newDesc, ...(newResp ? { _new_responsible: newResp } : {}), _new_due: newDue } : {}),
      });
      if (error) throw error;
      return linked;
    },
    onSuccess: (linked) => {
      toast.success(linked ? "Verificación registrada y nueva acción creada" : "Verificación registrada");
      void qc.invalidateQueries({ queryKey: ["actions"] });
      void qc.invalidateQueries({ queryKey: ["verifications", actionId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verificación de eficacia</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{actionDescription}</p>
        <div className="space-y-4">
          <div className="space-y-2">
            {CHECKS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks[k]} onCheckedChange={(v) => setChecks((c) => ({ ...c, [k]: v === true }))} />
                {label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ver-result">Resultado</Label>
              <Select value={result} onValueChange={(v) => setResult(v as VerificationResult)}>
                <SelectTrigger id="ver-result"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RESULT_LABELS) as VerificationResult[]).map((r) => (
                    <SelectItem key={r} value={r}>{RESULT_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ver-date">Fecha</Label>
              <Input id="ver-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ver-obs">Observaciones</Label>
            <Textarea id="ver-obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
          {result === "no_eficaz" && (
            <div className="space-y-3 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={createNew} onCheckedChange={(v) => setCreateNew(v === true)} />
                Crear nueva acción vinculada
              </label>
              {createNew ? (
                <>
                  <Textarea aria-label="Descripción nueva acción" placeholder="Describe la nueva acción" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select value={newResp} onValueChange={setNewResp}>
                      <SelectTrigger aria-label="Responsable nueva acción"><SelectValue placeholder="Responsable" /></SelectTrigger>
                      <SelectContent>
                        {(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? "Sin nombre"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input aria-label="Fecha compromiso nueva acción" type="date" min={today} value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">La acción original quedará como cancelada y enlazada a la nueva.</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">La acción volverá a "En proceso" para corregirse.</p>
              )}
            </div>
          )}
          {result === "parcialmente_eficaz" && (
            <p className="text-xs text-muted-foreground">La acción volverá a "En proceso" y requerirá nueva evidencia.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar verificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VerificationHistory({ actionId }: { actionId: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["verifications", actionId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_verifications")
        .select("*, verifier:profiles!action_verifications_verifier_id_fkey(full_name), follow:actions!action_verifications_follow_up_action_id_fkey(description)")
        .eq("action_id", actionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const yes = (b: boolean) => (b ? "Sí" : "No");
  return (
    <div className="w-full">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
        <History className="mr-2 h-4 w-4" /> {open ? "Ocultar" : "Ver"} historial de verificaciones
      </Button>
      {open && (
        <div className="mt-2 space-y-2">
          {q.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {q.data?.length === 0 && <p className="text-xs text-muted-foreground">Sin verificaciones registradas.</p>}
          {q.data?.map((v) => (
            <div key={v.id} className="rounded-md border p-3 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 font-medium", RESULT_TONE[v.result as VerificationResult])}>
                  {RESULT_LABELS[v.result as VerificationResult]}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(v.verified_on)} · {(v.verifier as { full_name: string | null } | null)?.full_name ?? "—"}
                </span>
              </div>
              <p>
                Implementada: {yes(v.action_implemented)} · Evidencia revisada: {yes(v.evidence_reviewed)} · Control correcto: {yes(v.control_implemented)} · Riesgo controlado: {yes(v.risk_controlled)}
              </p>
              {v.observations && <p>Observaciones: {v.observations}</p>}
              <p className="text-muted-foreground">
                Estado: {v.previous_status ? ACTION_STATUS_LABELS[v.previous_status as ActionStatus] : "—"} → {v.new_status ? ACTION_STATUS_LABELS[v.new_status as ActionStatus] : "—"}
              </p>
              {v.follow && <p>Nueva acción vinculada: {(v.follow as { description: string }).description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
