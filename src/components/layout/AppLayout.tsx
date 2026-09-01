import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";

type AppLayoutProps = {
  title: string;
  subtitle?: string;
  role: AppRole;
  userName: string;
  email: string;
  children: ReactNode;
};

export function AppLayout({
  title,
  subtitle,
  role,
  userName,
  email,
  children,
}: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("No fue posible cerrar la sesión", { description: error.message });
      return;
    }
    await navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop / tablet grande: sidebar fija */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        <AppSidebar role={role} userName={userName} onSignOut={handleSignOut} />
      </aside>

      {/* Tablet y móvil: drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegación principal</SheetTitle>
          <AppSidebar
            role={role}
            userName={userName}
            onNavigate={() => setMenuOpen(false)}
            onSignOut={handleSignOut}
          />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <AppHeader
          title={title}
          subtitle={subtitle}
          role={role}
          userName={userName}
          email={email}
          onOpenMenu={() => setMenuOpen(true)}
          onSignOut={handleSignOut}
        />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
