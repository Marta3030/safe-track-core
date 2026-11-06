import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, History, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/layout/ModulePage";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { inviteUser } from "@/lib/admin.functions";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { formatDateTime } from "@/lib/cases";

export const Route = createFileRoute("/_authenticated/administracion")({
  head: () => ({
    meta: [
      { title: "Administración | Safety360 HSEQ" },
      { name: "description", content: "Gestión de usuarios, roles, empresa, centros de trabajo, departamentos, áreas y auditoría." },
      { property: "og:title", content: "Administración | Safety360 HSEQ" },
      { property: "og:description", content: "Configuración multiempresa, roles y registro de auditoría." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { role, profile, user } = useSession();
  const isAdmin = role === "administrador";
  const canWrite = isAdmin || role === "prevencionista";
  const canAudit = canWrite || role === "auditor";
  return (
    <ModulePage title="Administración" subtitle="Empresa, estructura, usuarios y auditoría">
      <Tabs defaultValue="estructura">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="estructura"><Building2 className="mr-1 h-4 w-4" />Estructura</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="mr-1 h-4 w-4" />Usuarios y roles</TabsTrigger>
          {canAudit && <TabsTrigger value="auditoria"><History className="mr-1 h-4 w-4" />Auditoría</TabsTrigger>}
        </TabsList>
        <TabsContent value="estructura"><Structure orgId={profile?.organization_id ?? null} isAdmin={isAdmin} canWrite={canWrite} /></TabsContent>
        <TabsContent value="usuarios"><UsersTab isAdmin={isAdmin} myId={user?.id ?? ""} /></TabsContent>
        {canAudit && <TabsContent value="auditoria"><AuditTab /></TabsContent>}
      </Tabs>
    </ModulePage>
  );
}

/* ---------------- Estructura ---------------- */
function useStructure() {
  return useQuery({
    queryKey: ["admin-structure"],
    queryFn: async () => {
      const [org, centers, deps, areas] = await Promise.all([
        supabase.from("organizations").select("id, name, tax_id").maybeSingle(),
        supabase.from("work_centers").select("id, name, address").is("deleted_at", null).order("name"),
        supabase.from("departments").select("id, name, work_center_id").is("deleted_at", null).order("name"),
        supabase.from("areas").select("id, name, work_center_id, department_id").is("deleted_at", null).order("name"),
      ]);
      for (const r of [org, centers, deps, areas]) if (r.error) throw r.error;
      return { org: org.data, centers: centers.data ?? [], deps: deps.data ?? [], areas: areas.data ?? [] };
    },
  });
}

function Structure({ orgId, isAdmin, canWrite }: { orgId: string | null; isAdmin: boolean; canWrite: boolean }) {
  const qc = useQueryClient();
  const { data } = useStructure();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [taxId, setTaxId] = useState<string | null>(null);
  const [center, setCenter] = useState("");
  const [newDep, setNewDep] = useState<Record<string, string>>({});
  const [newArea, setNewArea] = useState<Record<string, { name: string; dep: string }>>({});
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-structure"] });
    qc.invalidateQueries({ queryKey: ["case-catalogs"] });
  };
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) toast.error(error.message);
    else { toast.success(ok); refresh(); }
  };
  const softDelete = (table: "work_centers" | "departments" | "areas", id: string) =>
    run(supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id), "Eliminado");

  if (!data) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  return (
    <div className="space-y-4">
      <SectionCard title="Empresa" description="Solo el administrador puede editar los datos de la empresa">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <div className="space-y-1"><Label htmlFor="org-name">Razón social</Label>
            <Input id="org-name" disabled={!isAdmin} value={orgName ?? data.org?.name ?? ""} onChange={(e) => setOrgName(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="org-rut">RUT</Label>
            <Input id="org-rut" disabled={!isAdmin} value={taxId ?? data.org?.tax_id ?? ""} onChange={(e) => setTaxId(e.target.value)} /></div>
          {isAdmin && (
            <Button disabled={!orgId || !(orgName ?? data.org?.name)?.trim()} onClick={() =>
              run(supabase.from("organizations").update({ name: (orgName ?? data.org?.name ?? "").trim(), tax_id: (taxId ?? data.org?.tax_id) || null }).eq("id", orgId!), "Empresa actualizada")}>
              Guardar
            </Button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Centros de trabajo, departamentos y áreas">
        {canWrite && (
          <div className="mb-4 flex gap-2">
            <Input placeholder="Nuevo centro de trabajo" aria-label="Nuevo centro de trabajo" value={center} onChange={(e) => setCenter(e.target.value)} />
            <Button disabled={!center.trim() || !orgId} onClick={async () => {
              await run(supabase.from("work_centers").insert({ name: center.trim(), organization_id: orgId! }), "Centro creado");
              setCenter("");
            }}><Plus className="h-4 w-4" />Centro</Button>
          </div>
        )}
        <div className="space-y-3">
          {data.centers.length === 0 && <p className="text-sm text-muted-foreground">Sin centros de trabajo.</p>}
          {data.centers.map((c) => {
            const deps = data.deps.filter((d) => d.work_center_id === c.id);
            const areas = data.areas.filter((a) => a.work_center_id === c.id);
            const na = newArea[c.id] ?? { name: "", dep: "" };
            return (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{c.name}</p>
                  {canWrite && <Button variant="ghost" size="icon" aria-label={`Eliminar ${c.name}`} onClick={() => softDelete("work_centers", c.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-1">Departamentos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {deps.map((d) => (
                        <Badge key={d.id} variant="secondary" className="gap-1">{d.name}
                          {canWrite && <button aria-label={`Eliminar ${d.name}`} onClick={() => softDelete("departments", d.id)}>×</button>}</Badge>
                      ))}
                      {!deps.length && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    {canWrite && (
                      <div className="mt-2 flex gap-2">
                        <Input className="h-8" placeholder="Nuevo departamento" aria-label={`Nuevo departamento en ${c.name}`} value={newDep[c.id] ?? ""} onChange={(e) => setNewDep({ ...newDep, [c.id]: e.target.value })} />
                        <Button size="sm" variant="outline" disabled={!newDep[c.id]?.trim()} onClick={async () => {
                          await run(supabase.from("departments").insert({ name: newDep[c.id]!.trim(), work_center_id: c.id }), "Departamento creado");
                          setNewDep({ ...newDep, [c.id]: "" });
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="eyebrow mb-1">Áreas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {areas.map((a) => (
                        <Badge key={a.id} variant="outline" className="gap-1">{a.name}
                          {a.department_id && <span className="text-muted-foreground">· {deps.find((d) => d.id === a.department_id)?.name}</span>}
                          {canWrite && <button aria-label={`Eliminar ${a.name}`} onClick={() => softDelete("areas", a.id)}>×</button>}</Badge>
                      ))}
                      {!areas.length && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    {canWrite && (
                      <div className="mt-2 flex gap-2">
                        <Input className="h-8" placeholder="Nueva área" aria-label={`Nueva área en ${c.name}`} value={na.name} onChange={(e) => setNewArea({ ...newArea, [c.id]: { ...na, name: e.target.value } })} />
                        {deps.length > 0 && (
                          <Select value={na.dep || "none"} onValueChange={(v) => setNewArea({ ...newArea, [c.id]: { ...na, dep: v === "none" ? "" : v } })}>
                            <SelectTrigger className="h-8 w-36" aria-label="Departamento del área"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin depto.</SelectItem>
                              {deps.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Button size="sm" variant="outline" disabled={!na.name.trim()} onClick={async () => {
                          await run(supabase.from("areas").insert({ name: na.name.trim(), work_center_id: c.id, department_id: na.dep || null }), "Área creada");
                          setNewArea({ ...newArea, [c.id]: { name: "", dep: "" } });
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------------- Usuarios ---------------- */
function UsersTab({ isAdmin, myId }: { isAdmin: boolean; myId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, full_name, job_title, is_active, created_at").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((u) => ({ ...u, role: (r.data ?? []).find((x) => x.user_id === u.id)?.role as AppRole | undefined }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const setRole = async (userId: string, role: AppRole) => {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    const ins = del.error ? del : await supabase.from("user_roles").insert({ user_id: userId, role });
    if (ins.error) toast.error(ins.error.message); else toast.success("Rol actualizado");
    refresh();
  };
  const setActive = async (userId: string, is_active: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active }).eq("id", userId);
    if (error) toast.error(error.message); else toast.success(is_active ? "Usuario activado" : "Usuario desactivado");
    refresh();
  };

  return (
    <SectionCard
      title="Usuarios de la empresa"
      description="El registro público está deshabilitado: solo se ingresa por invitación de un administrador."
      action={isAdmin && <Button size="sm" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Invitar usuario</Button>}
    >
      <div className="divide-y divide-border">
        {data.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.full_name || "Sin nombre"}{u.id === myId && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}</p>
              <p className="text-xs text-muted-foreground">{u.job_title || "—"}</p>
            </div>
            {isAdmin && u.id !== myId ? (
              <Select value={u.role ?? ""} onValueChange={(v) => setRole(u.id, v as AppRole)}>
                <SelectTrigger className="w-52" aria-label={`Rol de ${u.full_name}`}><SelectValue placeholder="Sin rol" /></SelectTrigger>
                <SelectContent>{APP_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{u.role ? ROLE_LABELS[u.role] : "Sin rol"}</Badge>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={u.is_active} disabled={!isAdmin || u.id === myId} onCheckedChange={(v) => setActive(u.id, v)} aria-label={`Activo ${u.full_name}`} />
              <span className="w-16 text-xs text-muted-foreground">{u.is_active ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
        ))}
      </div>
      <InviteDialog open={open} onOpenChange={setOpen} onDone={refresh} />
    </SectionCard>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [form, setForm] = useState({ email: "", full_name: "", job_title: "", role: "supervisor" as AppRole });
  const m = useMutation({
    mutationFn: () => inviteUser({ data: { ...form, redirect_to: `${window.location.origin}/auth/actualizar-clave` } }),
    onSuccess: () => {
      toast.success(`Invitación enviada a ${form.email}`);
      setForm({ email: "", full_name: "", job_title: "", role: "supervisor" });
      onOpenChange(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="inv-email">Correo</Label><Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="inv-name">Nombre completo</Label><Input id="inv-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="inv-job">Cargo</Label><Input id="inv-job" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Rol</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
              <SelectTrigger aria-label="Rol"><SelectValue /></SelectTrigger>
              <SelectContent>{APP_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">La persona recibirá un correo para crear su contraseña e ingresar a tu empresa.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={m.isPending || !form.email || form.full_name.trim().length < 2} onClick={() => m.mutate()}>
            {m.isPending ? "Enviando…" : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Auditoría ---------------- */
const ACTION_LABELS: Record<string, string> = {
  creacion: "Creación", edicion: "Edición", cambio_estado: "Cambio de estado", evidencia: "Evidencia",
  verificacion: "Verificación", cierre: "Cierre", baja: "Baja", eliminacion: "Eliminación",
};
const ENTITY_LABELS: Record<string, string> = {
  cases: "Caso", case_evidences: "Evidencia", investigations: "Investigación", investigation_causes: "Causa",
  action_plans: "Plan de acción", actions: "Acción", action_verifications: "Verificación", hazards: "MIPER",
  trainings: "Capacitación", organizations: "Empresa", work_centers: "Centro", areas: "Área",
  departments: "Departamento", user_roles: "Rol", profiles: "Usuario",
};

function AuditTab() {
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["audit", action, entity],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("id, entity, action, summary, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)")
        .order("created_at", { ascending: false }).limit(200);
      if (action) q = q.eq("action", action);
      if (entity) q = q.eq("entity", entity);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <SectionCard title="Registro de auditoría" description="Últimos 200 movimientos registrados automáticamente">
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48" aria-label="Tipo de operación"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas las operaciones</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={entity || "all"} onValueChange={(v) => setEntity(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48" aria-label="Módulo"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los módulos</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin registros.</p>
      ) : (
        <div className="divide-y divide-border">
          {data.map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
              <Badge variant="outline">{ENTITY_LABELS[r.entity] ?? r.entity}</Badge>
              <Badge variant="secondary">{ACTION_LABELS[r.action] ?? r.action}</Badge>
              <span className="min-w-0 flex-1 truncate">{r.summary || "—"}</span>
              <span className="text-xs text-muted-foreground">{r.actor?.full_name ?? "Sistema"}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
