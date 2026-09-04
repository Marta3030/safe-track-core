import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogs, type CaseListRow } from "@/hooks/use-cases";
import {
  CASE_SEVERITIES,
  CASE_SEVERITY_LABELS,
  CASE_TYPES,
  CASE_TYPE_LABELS,
  fromLocalInput,
  toLocalInput,
  type CaseSeverity,
  type CaseType,
} from "@/lib/cases";

const NONE = "__none__";

type FormState = {
  type: CaseType;
  severity: CaseSeverity;
  title: string;
  description: string;
  occurred_at: string;
  organization_id: string;
  work_center_id: string;
  area_id: string;
  location_detail: string;
  affected_person_name: string;
  affected_person_job: string;
  lost_days: string;
  immediate_actions: string;
};

function emptyForm(organizationId: string): FormState {
  return {
    type: "incidente",
    severity: "leve",
    title: "",
    description: "",
    occurred_at: toLocalInput(null),
    organization_id: organizationId,
    work_center_id: NONE,
    area_id: NONE,
    location_detail: "",
    affected_person_name: "",
    affected_person_job: "",
    lost_days: "0",
    immediate_actions: "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseRow?: CaseListRow | null;
  defaultOrganizationId?: string | null;
  userId?: string | null;
  onSaved?: (caseId: string) => void;
};

export function CaseFormDialog({
  open,
  onOpenChange,
  caseRow,
  defaultOrganizationId,
  userId,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const { data: catalogs } = useCatalogs();
  const organizations = catalogs?.organizations ?? [];
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultOrganizationId ?? ""));

  const isEdit = Boolean(caseRow);

  useEffect(() => {
    if (!open) return;
    if (caseRow) {
      setForm({
        type: caseRow.type,
        severity: caseRow.severity,
        title: caseRow.title ?? "",
        description: caseRow.description ?? "",
        occurred_at: toLocalInput(caseRow.occurred_at),
        organization_id: caseRow.organization_id,
        work_center_id: caseRow.work_center_id ?? NONE,
        area_id: caseRow.area_id ?? NONE,
        location_detail: caseRow.location_detail ?? "",
        affected_person_name: caseRow.affected_person_name ?? "",
        affected_person_job: caseRow.affected_person_job ?? "",
        lost_days: String(caseRow.lost_days ?? 0),
        immediate_actions: caseRow.immediate_actions ?? "",
      });
    } else {
      setForm(emptyForm(defaultOrganizationId ?? organizations[0]?.id ?? ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseRow?.id, defaultOrganizationId, organizations.length]);

  const centers = useMemo(
    () => (catalogs?.workCenters ?? []).filter((c) => c.organization_id === form.organization_id),
    [catalogs, form.organization_id],
  );
  const areas = useMemo(
    () => (catalogs?.areas ?? []).filter((a) => a.work_center_id === form.work_center_id),
    [catalogs, form.work_center_id],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async (mode: "draft" | "report") => {
      if (!form.title.trim()) throw new Error("El título del caso es obligatorio.");
      if (!form.organization_id) throw new Error("Selecciona la empresa del caso.");

      const payload = {
        organization_id: form.organization_id,
        work_center_id: form.work_center_id === NONE ? null : form.work_center_id,
        area_id: form.area_id === NONE ? null : form.area_id,
        type: form.type,
        severity: form.severity,
        title: form.title.trim(),
        description: form.description.trim() || null,
        occurred_at: fromLocalInput(form.occurred_at),
        location_detail: form.location_detail.trim() || null,
        affected_person_name: form.affected_person_name.trim() || null,
        affected_person_job: form.affected_person_job.trim() || null,
        lost_days: Number.isFinite(Number(form.lost_days)) ? Number(form.lost_days) : 0,
        immediate_actions: form.immediate_actions.trim() || null,
      };

      if (caseRow) {
        const update: Record<string, unknown> = { ...payload };
        if (mode === "report" && caseRow.status === "borrador") {
          update["status"] = "reportado";
          update["reported_at"] = new Date().toISOString();
        }
        const { data, error } = await supabase
          .from("cases")
          .update(update)
          .eq("id", caseRow.id)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }

      const { data, error } = await supabase
        .from("cases")
        .insert({
          ...payload,
          status: mode === "draft" ? "borrador" : "reportado",
          reported_at: new Date().toISOString(),
          reported_by: userId ?? null,
          created_by: userId ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id, mode) => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(
        mode === "draft" ? "Borrador guardado" : isEdit ? "Caso actualizado" : "Caso registrado",
      );
      onOpenChange(false);
      onSaved?.(id);
    },
    onError: (error: Error) => {
      toast.error("No fue posible guardar el caso", { description: error.message });
    },
  });

  const saving = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${caseRow?.code ?? "caso"}` : "Nuevo caso"}</DialogTitle>
          <DialogDescription>
            Registra el evento. Puedes guardarlo como borrador y completarlo más tarde.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Título del evento *</Label>
            <Input
              id="title"
              value={form.title}
              maxLength={180}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ej: Caída al mismo nivel en zona de despacho"
            />
          </div>

          <div>
            <Label>Tipo de evento</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as CaseType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{CASE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Gravedad</Label>
            <Select value={form.severity} onValueChange={(v) => set("severity", v as CaseSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASE_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>{CASE_SEVERITY_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="occurred">Fecha y hora del evento</Label>
            <Input
              id="occurred"
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => set("occurred_at", e.target.value)}
            />
          </div>

          <div>
            <Label>Empresa *</Label>
            <Select
              value={form.organization_id || NONE}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  organization_id: v === NONE ? "" : v,
                  work_center_id: NONE,
                  area_id: NONE,
                }))
              }
            >
              <SelectTrigger><SelectValue placeholder="Selecciona empresa" /></SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Centro de trabajo</Label>
            <Select
              value={form.work_center_id}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, work_center_id: v, area_id: NONE }))
              }
            >
              <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin especificar</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Área</Label>
            <Select value={form.area_id} onValueChange={(v) => set("area_id", v)}>
              <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin especificar</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="place">Lugar exacto</Label>
            <Input
              id="place"
              value={form.location_detail}
              maxLength={200}
              onChange={(e) => set("location_detail", e.target.value)}
              placeholder="Ej: Pasillo 3, bodega de insumos"
            />
          </div>

          <div>
            <Label htmlFor="person">Persona afectada</Label>
            <Input
              id="person"
              value={form.affected_person_name}
              maxLength={120}
              onChange={(e) => set("affected_person_name", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="job">Cargo</Label>
            <Input
              id="job"
              value={form.affected_person_job}
              maxLength={120}
              onChange={(e) => set("affected_person_job", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="lost">Días perdidos</Label>
            <Input
              id="lost"
              type="number"
              min={0}
              value={form.lost_days}
              onChange={(e) => set("lost_days", e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="desc">Descripción del evento</Label>
            <Textarea
              id="desc"
              rows={4}
              maxLength={4000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="¿Qué ocurrió? Secuencia de hechos, condiciones y personas involucradas."
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="imm">Acciones inmediatas adoptadas</Label>
            <Textarea
              id="imm"
              rows={3}
              maxLength={2000}
              value={form.immediate_actions}
              onChange={(e) => set("immediate_actions", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {(!isEdit || caseRow?.status === "borrador") && (
            <Button variant="outline" onClick={() => mutation.mutate("draft")} disabled={saving}>
              Guardar borrador
            </Button>
          )}
          <Button onClick={() => mutation.mutate("report")} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Registrar caso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
