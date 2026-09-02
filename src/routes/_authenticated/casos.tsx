import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/casos")({
  head: () => ({
    meta: [
      { title: "Accidentes e Incidentes | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Listado y expediente digital de accidentes, incidentes y casi accidentes laborales.",
      },
      { property: "og:title", content: "Accidentes e Incidentes | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Gestión completa del ciclo de investigación de eventos laborales.",
      },
    ],
  }),
  component: CasesPage,
});

function CasesPage() {
  return (
    <ModulePage
      title="Accidentes e Incidentes"
      subtitle="Listado de casos y expediente digital"
    >
      <ModulePlaceholder
        icon={AlertTriangle}
        phase="Fase 3 · Próximo módulo a construir"
        description="Registro de eventos con identificador correlativo (ACC-AAAA-0001), listado filtrable y expediente digital por caso."
        scope={[
          "Listado con filtros por empresa, centro, área, tipo, gravedad, estado y responsable",
          "Formulario de creación en 4 pasos con guardado de borrador",
          "Expediente con pestañas: resumen, investigación, evidencias, análisis causal, plan de acción, MIPER, capacitación e historial",
          "Línea de tiempo automática con usuario, fecha y acción",
        ]}
      />
    </ModulePage>
  );
}
