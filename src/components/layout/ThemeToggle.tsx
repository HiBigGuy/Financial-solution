import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5 text-left transition hover:border-border-strong",
        className
      )}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/15 text-brand">
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </span>
      <span className="flex-1 text-[12px] font-medium text-foreground">
        {isDark ? "Modo Claro" : "Modo Escuro"}
      </span>
      <Switch checked={isDark} onCheckedChange={toggle} />
    </button>
  );
}