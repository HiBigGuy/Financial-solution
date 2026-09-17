import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/features/auth/useAuth";
import { cn } from "@/lib/utils";

export function LogoMark({ size = "md" }: { size?: "md" | "sm" }) {
  const box = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-purple-500", box)}>
      <svg viewBox="0 0 48 48" className={icon} aria-hidden="true" focusable="false">
        <path d="M16 30L24 18L30 26L36 15" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="36" cy="15" r="3.4" fill="#fff" />
        <circle cx="16" cy="30" r="3.4" fill="#fff" />
      </svg>
    </span>
  );
}

export function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex items-center gap-2.5" onClick={onNavigate}>
      <LogoMark />
      <span className="text-[16px] font-semibold tracking-tight text-foreground">
        Vault
      </span>
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, user } = useAuth();
  const name = profile?.name || user?.email?.split("@")[0] || "Usuário";
  const initial = (name.trim()[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Topo: logo + usuário */}
      <div className="space-y-4 border-b border-border px-5 pb-5 pt-6">
        <Logo onNavigate={onNavigate} />
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
            <p className="truncate text-[11px] text-faint">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                isActive
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:bg-surface-2/50 hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-brand" : "text-faint group-hover:text-muted")} aria-hidden="true" />
                <span>{label}</span>
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" aria-hidden="true" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé: toggle de tema (fixo) */}
      <div className="border-t border-border p-3">
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-border lg:block">
      <SidebarContent />
    </aside>
  );
}