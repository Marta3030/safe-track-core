import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3 } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/miper")({
  head: () => ({
    meta: [
      { title: "MIPER | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Matriz de identificación de peligros y evaluación de riesgos con metodología configurable.",
      },
      { property: "og:title", content: "MIPER | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Identificación de peligros, evaluación de riesgos y riesgo residual.",
      },
    ],
  }),
  component: MiperPage,
});

function MiperPage() {
  return (
    <ModulePage
      title="MIPER"
      subtitle="Matriz de identificación de peligros y evaluación de riesgos"
    >
      <ModulePlaceholder
        icon={Grid3x3}
        phase="Fase 8"
        description="Matriz por proceso, actividad y tarea, con metodología de evaluación configurable (matriz 5x5 por defecto)."
        scope={[
          "Peligro, riesgo, personas expuestas y controles existentes",
          "Probabilidad, consecuencia y nivel de riesgo según metodología configurable",
          "Medidas adicionales, responsable y fecha de revisión",
          "Vinculación directa entre un accidente y la fila MIPER correspondiente",
          "Comparación de evaluación anterior, posterior y riesgo residual",
        ]}
      />
    </ModulePage>
  );
}
