import { Info } from "lucide-react";

/** Aviso permanente: los datos de esta demo son ficticios. */
export function DemoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
      <p className="text-xs leading-relaxed text-foreground md:text-sm">
        <span className="font-semibold">Entorno de demostración.</span> Todos los datos mostrados
        son ficticios (Industrial Demo SpA). Los indicadores se conectarán a datos reales al
        completarse los módulos de casos y acciones.
      </p>
    </div>
  );
}
