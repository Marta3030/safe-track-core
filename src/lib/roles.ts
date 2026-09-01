export const APP_ROLES = [
  "administrador",
  "prevencionista",
  "supervisor",
  "auditor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: "Administrador",
  prevencionista: "Prevencionista",
  supervisor: "Supervisor / Responsable",
  auditor: "Auditor / Visualizador",
};

/** Rol mínimo cuando el usuario aún no tiene rol asignado por administración. */
export const DEFAULT_ROLE: AppRole = "auditor";

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function canManageCases(role: AppRole): boolean {
  return role === "administrador" || role === "prevencionista";
}
