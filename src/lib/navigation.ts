import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardCheck,
  Grid3x3,
  GraduationCap,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { FileRoutesByTo } from "@/routeTree.gen";
import type { AppRole } from "@/lib/roles";

export type NavItem = {
  to: keyof FileRoutesByTo;
  label: string;
  icon: LucideIcon;
  /** Roles con acceso al módulo. */
  roles: readonly AppRole[];
};

const ALL_ROLES = [
  "administrador",
  "prevencionista",
  "supervisor",
  "auditor",
] as const satisfies readonly AppRole[];

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { to: "/casos", label: "Accidentes e Incidentes", icon: AlertTriangle, roles: ALL_ROLES },
  { to: "/planes-accion", label: "Planes de Acción", icon: ClipboardCheck, roles: ALL_ROLES },
  { to: "/miper", label: "MIPER", icon: Grid3x3, roles: ALL_ROLES },
  { to: "/capacitaciones", label: "Capacitaciones", icon: GraduationCap, roles: ALL_ROLES },
  { to: "/reportes", label: "Reportes e Indicadores", icon: BarChart3, roles: ALL_ROLES },
  { to: "/administracion", label: "Administración", icon: Settings, roles: ["administrador"] },
];
