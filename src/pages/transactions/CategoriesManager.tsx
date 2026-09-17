import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";
import type { Category } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/palette";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULTS: { name: string; kind: Category["kind"]; color: string }[] = [
  { name: "Moradia", kind: "expense", color: "#3b82f6" },
  { name: "Alimentação", kind: "expense", color: "#22c55e" },
  { name: "Transporte", kind: "expense", color: "#8b5cf6" },
  { name: "Lazer", kind: "expense", color: "#f97316" },
  { name: "Assinaturas", kind: "expense", color: "#ec4899" },
  { name: "Compras", kind: "expense", color: "#eab308" },
  { name: "Saúde", kind: "expense", color: "#06b6d4" },
  { name: "Salário", kind: "income", color: "#22c55e" },
  { name: "Freela", kind: "income", color: "#8b5cf6" },
  { name: "Rendimentos", kind: "income", color: "#3b82f6" },
];

export function CategoriesManager({
  open,
  onOpenChange,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!supabase || !user) return;
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      kind,
      color,
      user_id: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar a categoria");
      return;
    }
    setName("");
    toast.success("Categoria criada");
    onSaved();
  };

  const addDefaults = async () => {
    if (!supabase || !user) return;
    setBusy(true);
    const existing = new Set(categories.map((c) => c.name.toLowerCase()));
    const toInsert = DEFAULTS.filter((d) => !existing.has(d.name.toLowerCase()));
    if (toInsert.length === 0) {
      toast.message("Categorias padrão já existem");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("categories")
      .insert(toInsert.map((d) => ({ ...d, user_id: user.id })));
    setBusy(false);
    if (error) {
      toast.error("Não foi possível criar");
      return;
    }
    toast.success(`${toInsert.length} categorias criadas`);
    onSaved();
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Categoria excluída");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
          <DialogDescription>
            Organize receitas e despesas por categoria.
          </DialogDescription>
        </DialogHeader>

        {/* Criar nova categoria */}
        <div className="rounded-xl border border-border bg-surface-2/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              {CATEGORY_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full transition",
                    color === c && "ring-2 ring-foreground/40 ring-offset-1 ring-offset-surface"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <div className="flex gap-1 rounded-lg bg-surface p-0.5 text-[12px]">
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition",
                    kind === k ? "bg-surface-2 text-foreground" : "text-faint"
                  )}
                >
                  {k === "expense" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button size="sm" onClick={add} disabled={busy || !name.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted">
            {categories.length} categorias
          </span>
          <Button variant="subtle" size="sm" onClick={addDefaults} disabled={busy}>
            Carregar padrão
          </Button>
        </div>

        {/* Lista */}
        <div className="space-y-1.5">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-faint">
              Nenhuma categoria ainda.
            </p>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-[13px] text-foreground">{c.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      c.kind === "income" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    )}
                  >
                    {c.kind === "income" ? "Receita" : "Despesa"}
                  </span>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-lg p-1.5 text-faint transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Excluir ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}