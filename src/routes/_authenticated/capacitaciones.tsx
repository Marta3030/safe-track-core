import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ModulePage } from "@/components/layout/ModulePage";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/capacitaciones")({
  head: () => ({
    meta: [
      { title: "Capacitaciones | Safety360 HSEQ" },
      {
        name: "description",
        content:
          "Programación, ejecución y evidencia de capacitaciones asociadas a casos, acciones y riesgos MIPER.",
      },
      { property: "og:title", content: "Capacitaciones | Safety360 HSEQ" },
      {
        property: "og:description",
        content: "Capacitaciones vinculadas al aprendizaje derivado de los eventos.",
      },
    ],
  }),
  component: TrainingsPage,
});

function TrainingsPage() {
  return (
    <ModulePage title="Capacitaciones" subtitle="Programación, ejecución y evidencia">
      <ModulePlaceholder
        icon={GraduationCap}
        phase="Fase 9"
        description="Capacitaciones generadas desde las acciones del plan, con registro de asistentes y evidencia."
        scope={[
          "Tema, objetivo, empresa, centro, área, responsable y fecha",
          "Estados: programada, realizada, cancelada",
          "Registro de trabajadores asistentes",
          "Vinculación con accidente, acción o riesgo MIPER",
        ]}
      />
    </ModulePage>
  );
}
