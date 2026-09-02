import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes e Indicadores | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Reportes de accidentabilidad, cumplimiento de acciones, causas principales y tiempo promedio de cierre.",
      },
      { property: "og:title", content: "Reportes e Indicadores | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Indicadores preventivos filtrables por empresa, centro, área y período.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <ModulePage title="Reportes e Indicadores" subtitle="Análisis y exportación de resultados">
      <ModulePlaceholder
        icon={BarChart3}
        phase="Fase 10"
        description="Reportes filtrables construidos sobre los datos reales de casos, acciones y verificaciones."
        scope={[
          "Filtros por empresa, centro, área, fecha, tipo de evento y estado",
          "Resumen de accidentes y estado de acciones",
          "Principales causas raíz y accidentes por área",
          "Tiempo promedio de cierre y porcentaje de cumplimiento",
        ]}
      />
    </ModulePage>
  );
}
