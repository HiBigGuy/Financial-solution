import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Menu, Download, LogOut, UserRound } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { ProfileDialog } from "./ProfileDialog";

function exportAllData() {
  return async () => {
    const client = supabase;
    if (!client) return;
    const tables = [
      "profiles",
      "categories",
      "income_sources",
      "cards",
      "transactions",
      "investments",
      "goals",
    ] as const;
    try {
      const entries: Record<string, unknown> = {};
      await Promise.all(
        tables.map(async (t) => {
          const { data } = await client.from(t).select("*");
          entries[t] = data ?? [];
        })
      );
      entries["exported_at"] = new Date().toISOString();
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exportado");
    } catch {
      toast.error("Falha ao exportar dados");
    }
  };
}

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { profile, user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.to));
  const title = current?.title ?? "Vault";
  const name = profile?.name || user?.email?.split("@")[0] || "Usuário";
  const initial = (name.trim()[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        {onMenu ? (
          <button
            onClick={onMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="hidden text-[11px] text-faint sm:block">{current?.description ?? ""}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2"
          aria-label="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" aria-hidden="true" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white transition hover:brightness-110"
              aria-label="Menu do usuário"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="px-2.5 pb-1 pt-2">
              <div className="text-[13px] font-semibold text-foreground">{name}</div>
              <div className="truncate text-[11px] font-normal text-faint">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <UserRound className="mr-2 h-4 w-4 text-muted" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAllData()}>
              <Download className="mr-2 h-4 w-4 text-muted" />
              Exportar dados (JSON)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4 text-danger" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
}