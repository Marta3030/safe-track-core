export const EVIDENCE_BUCKET = "case-evidences";

/** Tamaño máximo permitido por archivo (15 MB). */
export const MAX_EVIDENCE_SIZE = 15 * 1024 * 1024;

export const ALLOWED_EVIDENCE_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};

export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "docx"];

export const EVIDENCE_ACCEPT = ".jpg,.jpeg,.png,.pdf,.docx";

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function isImageEvidence(mime: string | null, name: string | null): boolean {
  if (mime?.startsWith("image/")) return true;
  const ext = fileExtension(name ?? "");
  return ext === "jpg" || ext === "jpeg" || ext === "png";
}

/** Valida tipo y tamaño. Devuelve un mensaje de error o null si es válido. */
export function validateEvidenceFile(file: File): string | null {
  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `“${file.name}”: formato no permitido. Sólo JPG, JPEG, PNG, PDF o DOCX.`;
  }
  const mimeOk =
    !file.type ||
    Object.entries(ALLOWED_EVIDENCE_TYPES).some(
      ([mime, exts]) => mime === file.type && exts.includes(ext),
    );
  if (!mimeOk) {
    return `“${file.name}”: el contenido no coincide con la extensión declarada.`;
  }
  if (file.size > MAX_EVIDENCE_SIZE) {
    return `“${file.name}”: supera el máximo de ${formatFileSize(MAX_EVIDENCE_SIZE)}.`;
  }
  if (file.size === 0) {
    return `“${file.name}”: el archivo está vacío.`;
  }
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ruta segura dentro del bucket: organización / caso / archivo único. */
export function buildEvidencePath(orgId: string, caseId: string, fileName: string): string {
  const ext = fileExtension(fileName);
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${orgId}/${caseId}/${unique}.${ext}`;
}
