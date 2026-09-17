import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sidebar, SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-app">
      <Sidebar />

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 animate-overlay-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-background shadow-pop animate-content-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-6 rounded-lg p-1.5 text-muted transition hover:bg-surface-2"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}