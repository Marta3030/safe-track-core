import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "@/lib/navigation";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  role: AppRole;
  userName: string;
  onNavigate?: () => void;
  onSignOut: () => void;
};

export function AppSidebar({ role, userName, onNavigate, onSignOut }: AppSidebarProps) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo tone="dark" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="eyebrow px-2 pb-2 text-sidebar-foreground/50">Módulos</p>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
              "text-sidebar-foreground/80 transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
            activeProps={{
              className:
                "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary",
            }}
          >
            <item.icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
            <span className="leading-tight">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {userName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">{ROLE_LABELS[role]}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
