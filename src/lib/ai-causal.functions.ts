import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CausalSuggestion = {
  relations: { from_cause: string; to_cause: string; relation: string; rationale: string }[];
  measures: { measure: string; hierarchy: string; related_causes: string[]; rationale: string }[];
  information_gaps: string[];
};

const InputSchema = z.object({
  background: z.string().max(20000),
  causes: z.array(z.object({ type: z.string().max(40), text: z.string().max(2000) })).max(60),
});

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["relations", "measures", "information_gaps"],
  properties: {
    relations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from_cause", "to_cause", "relation", "rationale"],
        properties: {
          from_cause: { type: "string" },
          to_cause: { type: "string" },
          relation: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
    measures: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["measure", "hierarchy", "related_causes", "rationale"],
        properties: {
          measure: { type: "string" },
          hierarchy: { type: "string" },
          related_causes: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
        },
      },
    },
    information_gaps: { type: "array", items: { type: "string" } },
  },
};

const INSTRUCTIONS = `Eres un asistente para profesionales de prevención de riesgos (SST/HSEQ) en Chile.
Recibes antecedentes de una investigación de accidente/incidente y causas registradas por el profesional.
Tu tarea: (1) sugerir posibles relaciones entre las causas (p. ej. "contribuye a", "es consecuencia de"), citando el texto de las causas tal como fue ingresado; (2) sugerir medidas preventivas indicando su nivel en la jerarquía de controles (Eliminación, Sustitución, Ingeniería, Administrativo, EPP); (3) señalar información faltante.
REGLAS: NUNCA determines, declares ni sugieras cuál es la causa raíz; esa conclusión es exclusiva del profesional. Usa lenguaje tentativo ("podría", "posible"). No inventes hechos. Máximo 8 relaciones y 8 medidas. Responde en español.`;

export const suggestCausalRelations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<CausalSuggestion> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("El servicio de IA no está configurado.");
    if (!data.background.trim() && data.causes.length === 0) {
      throw new Error("Ingresa antecedentes o causas antes de pedir sugerencias.");
    }
    const userText = `ANTECEDENTES:\n${data.background || "(sin antecedentes)"}\n\nCAUSAS REGISTRADAS:\n${
      data.causes.map((c, i) => `${i + 1}. [${c.type}] ${c.text}`).join("\n") || "(sin causas)"
    }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: userText }],
        reasoning: { effort: "low" },
        store: false,
        stream: true,
        text: { format: { type: "json_schema", name: "causal_suggestions", strict: true, schema } },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      let msg = "";
      try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? ""; } catch { /* ignore */ }
      if (res.status === 429) throw new Error("Demasiadas solicitudes. Intenta nuevamente en unos minutos.");
      if (res.status === 402) throw new Error(msg || "Se agotaron los créditos de IA del espacio de trabajo.");
      throw new Error(msg || `El servicio de IA respondió con error ${res.status}.`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let failure = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") failure = "El modelo rechazó la solicitud.";
          else if (ev.type === "response.failed" || ev.type === "error")
            failure = ev.response?.error?.message ?? ev.message ?? "La IA no pudo completar la solicitud.";
        } catch { /* ignore partial */ }
      }
    }
    if (failure) throw new Error(failure);
    try {
      return JSON.parse(text) as CausalSuggestion;
    } catch {
      throw new Error("La IA devolvió una respuesta inválida. Intenta nuevamente.");
    }
  });
