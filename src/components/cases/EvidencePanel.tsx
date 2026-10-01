import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useEvidences, evidencesQueryKey, type EvidenceRow } from "@/hooks/use-evidences";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_BUCKET,
  buildEvidencePath,
  formatFileSize,
  isImageEvidence,
  validateEvidenceFile,
} from "@/lib/evidences";
import { formatDateTime } from "@/lib/cases";

type Props = {
  caseId: string;
  orgId: string | null;
  canManage: boolean;
  userId: string | null;
};

function Thumb({ row }: { row: EvidenceRow }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImg = isImageEvidence(row.mime_type, row.file_name);
  useEffect(() => {
    if (!isImg) return;
    let active = true;
    void supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(row.file_path, 300)
      .then(({ data }) => active && setUrl(data?.signedUrl ?? null));
    return () => {
      active = false;
    };
  }, [row.file_path, isImg]);
  if (isImg && url)
    return <img src={url} alt={row.file_name ?? "Evidencia"} className="h-full w-full object-cover" />;
  return <FileText className="h-10 w-10 text-muted-foreground" />;
}

export function EvidencePanel({ caseId, orgId, canManage, userId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const { data, isLoading, isError, error } = useEvidences(caseId);

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      if (!orgId) throw new Error("Tu perfil no tiene organización asignada.");
      const errors = files.map(validateEvidenceFile).filter(Boolean) as string[];
      if (errors.length) throw new Error(errors.join("\n"));
      for (const file of files) {
        const path = buildEvidencePath(orgId, caseId, file.name);
        const { error: upErr } = await supabase.storage
          .from(EVIDENCE_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("case_evidences").insert({
          case_id: caseId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          description: description.trim() || null,
          created_by: userId,
        });
        if (insErr) {
          await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
          throw insErr;
        }
      }
      return files.length;
    },
    onSuccess: (n) => {
      toast.success(n === 1 ? "Evidencia subida" : `${n} evidencias subidas`);
      setDescription("");
      void qc.invalidateQueries({ queryKey: evidencesQueryKey(caseId) });
    },
    onError: (e: Error) => toast.error(e.message || "No fue posible subir el archivo"),
  });

  const remove = useMutation({
    mutationFn: async (row: EvidenceRow) => {
      const { error: e } = await supabase
        .from("case_evidences")
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq("id", row.id);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success("Evidencia desactivada");
      void qc.invalidateQueries({ queryKey: evidencesQueryKey(caseId) });
    },
    onError: (e: Error) => toast.error(e.message || "No fue posible eliminar"),
  });

  async function open(row: EvidenceRow, download: boolean) {
    const { data: s, error: e } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(row.file_path, 120, download ? { download: row.file_name ?? true } : undefined);
    if (e || !s) return toast.error("No tienes acceso a este archivo o ya no existe.");
    window.open(s.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <section className="surface-card space-y-3 p-5">
          <h3 className="text-sm font-semibold">Subir evidencias</h3>
          <p className="text-xs text-muted-foreground">
            JPG, JPEG, PNG, PDF o DOCX · máximo 15 MB por archivo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={EVIDENCE_ACCEPT}
              className="hidden"
              aria-label="Seleccionar archivos"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) upload.mutate(files);
              }}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Subir archivos
            </Button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="surface-card p-6 text-sm text-destructive">
          No fue posible cargar evidencias: {(error as Error)?.message}
        </div>
      ) : !data?.length ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          Aún no hay evidencias asociadas a este caso.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((row) => (
            <li key={row.id} className="surface-card flex flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => void open(row, false)}
                className="flex h-36 items-center justify-center bg-muted"
                aria-label={`Visualizar ${row.file_name ?? "archivo"}`}
              >
                <Thumb row={row} />
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="truncate text-sm font-medium" title={row.file_name ?? ""}>
                  {row.file_name ?? "Archivo"}
                </p>
                {row.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(row.file_size)} · {formatDateTime(row.created_at)}
                </p>
                <div className="mt-auto flex gap-1 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => void open(row, false)}>
                    <Eye className="mr-1 h-4 w-4" /> Ver
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void open(row, true)}>
                    <Download className="mr-1 h-4 w-4" /> Descargar
                  </Button>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive"
                      aria-label="Eliminar evidencia"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`¿Desactivar “${row.file_name}”?`)) remove.mutate(row);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
