import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestCausalRelations, type CausalSuggestion } from "@/lib/ai-causal.functions";
import type { InvestigationRow } from "@/hooks/use-investigation";

type Cause = { cause_type: string; description: string };

function buildBackground(inv: InvestigationRow): string {
  const parts: [string, string | null | undefined][] = [
    ["Resumen de los hechos", (inv as Record<string, unknown>).summary as string | null],
    ["Secuencia del evento", inv.event_sequence],
    ["Condiciones", inv.conditions_description],
    ["Equipos", inv.equipment_involved],
    ["Procedimientos", inv.procedures_review],
    ["Capacitación previa", inv.prior_training],
    ["Controles existentes", inv.existing_controls],
    ["Observaciones", inv.observations],
  ];
  return parts.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v}`).join("\n\n");
}

export function AiCausalAssistant({ investigation, causes }: { investigation: InvestigationRow; causes: Cause[] }) {
  const [background, setBackground] = useState(() => buildBackground(investigation));
  const [extraCauses, setExtraCauses] = useState("");
  const [result, setResult] = useState<CausalSuggestion | null>(null);
  const suggest = useServerFn(suggestCausalRelations);

  const run = useMutation({
    mutationFn: () =>
      suggest({
        data: {
          background,
          causes: [
            ...causes.map((c) => ({ type: c.cause_type, text: c.description })),
            ...extraCauses.split("\n").map((t) => t.trim()).filter(Boolean).map((text) => ({ type: "propuesta", text })),
          ],
        },
      }),
    onSuccess: setResult,
  });

  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold">Asistente IA de relaciones y medidas</h3>
          <p className="text-xs text-muted-foreground">
            Sugiere posibles relaciones entre causas y medidas preventivas. No determina la causa raíz: esa conclusión es siempre del profesional.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="ai-bg">Antecedentes de la investigación</Label>
        <Textarea id="ai-bg" rows={6} value={background} onChange={(e) => setBackground(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ai-extra">Causas adicionales a considerar (una por línea, opcional)</Label>
        <Textarea id="ai-extra" rows={3} value={extraCauses} onChange={(e) => setExtraCauses(e.target.value)} />
        <p className="text-xs text-muted-foreground">Se incluyen automáticamente las {causes.length} causas ya registradas.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {run.isPending ? "Analizando…" : "Sugerir relaciones y medidas"}
        </Button>
        <Button variant="ghost" onClick={() => setBackground(buildBackground(investigation))}>Recargar antecedentes</Button>
      </div>
      {run.isError && <p className="text-sm text-destructive">{(run.error as Error).message}</p>}

      {result && (
        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Sugerencias generadas por IA · requieren validación profesional</p>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Posibles relaciones entre causas</h4>
            {result.relations.length === 0 ? <p className="text-sm text-muted-foreground">Sin relaciones sugeridas.</p> : (
              <ul className="space-y-2">
                {result.relations.map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{r.from_cause}</span> <span className="text-primary">→ {r.relation} →</span>{" "}
                    <span className="font-medium">{r.to_cause}</span>
                    <p className="text-xs text-muted-foreground">{r.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Posibles medidas preventivas</h4>
            <ul className="space-y-2">
              {result.measures.map((m, i) => (
                <li key={i} className="text-sm">
                  <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs">{m.hierarchy}</span>
                  {m.measure}
                  <p className="text-xs text-muted-foreground">
                    {m.rationale}{m.related_causes.length ? ` · Relacionada con: ${m.related_causes.join("; ")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          {result.information_gaps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Información que convendría completar</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.information_gaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
