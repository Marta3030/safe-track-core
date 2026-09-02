import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/administracion")({
  head: () => ({
    meta: [
      { title: "Administración | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Gestión de usuarios, roles, empresas, centros de trabajo, áreas y auditoría del sistema.",
      },
      { property: "og:title", content: "Administración | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Configuración multiempresa, roles y registro de auditoría.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <ModulePage title="Administración" subtitle="Usuarios, estructura organizacional y auditoría">
      <ModulePlaceholder
        icon={Settings}
        phase="Fases 2 y 11"
        description="Configuración de la estructura multiempresa, asignación de roles y trazabilidad de todas las operaciones."
        scope={[
          "Empresas, centros de trabajo, áreas y departamentos",
          "Invitación de usuarios y asignación de roles (registro público deshabilitado)",
          "Registro de auditoría: creación, edición, cambio de estado, evidencias, verificación y cierre",
          "Notificaciones del sistema",
        ]}
      />
    </ModulePage>
  );
}
