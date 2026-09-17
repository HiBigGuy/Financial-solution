import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Filter, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRows } from "@/hooks/use-rows";
import type { Transaction, Category, Card } from "@/lib/types";
import { brl, fmtDateShort, lastNMonths, monthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionForm } from "./TransactionForm";
import { CategoriesManager } from "./CategoriesManager";

const FILTER = "h-9 w-full rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-foreground outline-none transition focus:border-brand";

export function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [categorizingId, setCategorizingId] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [cardId, setCardId] = useState("all");
  const [month, setMonth] = useState("all");

  const tx = useRows<Transaction>("transactions", { orderBy: { column: "date", ascending: false } });
  const cats = useRows<Category>("categories", {});
  const cards = useRows<Card>("cards", {});

  const months = useMemo(() => lastNMonths(12), []);

  const catMap = useMemo(() => new Map(cats.data.map((c) => [c.id, c])), [cats.data]);
  const cardMap = useMemo(() => new Map(cards.data.map((c) => [c.id, c])), [cards.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tx.data.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (categoryId !== "all" && t.category_id !== categoryId) return false;
      if (cardId !== "all" && t.card_id !== cardId) return false;
      if (month !== "all" && monthKey(t.date) !== month) return false;
      if (q) {
        const hay = [t.description, ...(t.tags ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tx.data, search, type, categoryId, cardId, month]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const confirmDelete = async () => {
    if (!deleting || !supabase) return;
    setDeletingLoading(true);
    const { error } = await supabase.from("transactions").delete().eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Transação excluída");
    setDeleting(null);
    tx.refetch();
  };

  const categorizeWithAi = async (transactionId: string) => {
    if (!supabase) return;
    setCategorizingId(transactionId);
    const { error } = await supabase.functions.invoke("categorize", {
      body: { transactionId },
    });
    setCategorizingId(null);
    if (error) {
      toast.error("Não foi possível categorizar com IA");
      return;
    }
    toast.success("Transação categorizada com IA");
    tx.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Transações"
        description="Receitas e despesas com busca e filtros"
        actions={
          <>
            <Button variant="outline" onClick={() => setCatsOpen(true)}>
              <Filter className="h-4 w-4" />
              Categorias
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              Nova transação
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            className={FILTER}
            style={{ paddingLeft: 36 }}
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar transações"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className={FILTER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className={FILTER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {cats.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cardId} onValueChange={setCardId}>
          <SelectTrigger className={FILTER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cartões</SelectItem>
            {cards.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className={FILTER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Totais */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-1.5 text-[12px] font-semibold text-success">
          <ArrowDownLeft className="h-3.5 w-3.5" /> {brl(totals.income)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-1.5 text-[12px] font-semibold text-danger">
          <ArrowUpRight className="h-3.5 w-3.5" /> {brl(totals.expense)}
        </span>
        <span className="text-[12px] text-faint">
          Saldo <strong className={cn("tabular-nums", totals.net >= 0 ? "text-success" : "text-danger")}>{brl(totals.net)}</strong>
        </span>
      </div>

      {/* Lista */}
      {tx.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tx.data.length === 0 ? "Nenhuma transação cadastrada" : "Nada encontrado"}
          description={
            tx.data.length === 0
              ? "Comece registrando sua primeira receita ou despesa."
              : "Ajuste os filtros ou a busca para encontrar o que procura."
          }
          action={
            tx.data.length === 0 ? (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4" /> Nova transação
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-border">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Cartão</th>
                  <th className="px-4 py-3 font-medium">Recorrência</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const cat = t.category_id ? catMap.get(t.category_id) : undefined;
                  const card = t.card_id ? cardMap.get(t.card_id) : undefined;
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 transition hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{t.description}</div>
                        {t.tags.length > 0 ? (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {t.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded bg-surface-3/60 px-1.5 py-0.5 text-[10px] text-faint">#{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{fmtDateShort(t.date)}</td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{card?.name ?? <span className="text-faint">—</span>}</td>
                      <td className="px-4 py-3">
                        {t.recurrence === "installments" ? (
                          <span className="text-faint">{t.installment_no}/{t.installment_total}×</span>
                        ) : t.recurrence === "fixed" ? (
                          <span className="text-faint">Fixa</span>
                        ) : (
                          <span className="text-faint">Única</span>
                        )}
                      </td>
                      <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", t.type === "income" ? "text-success" : "text-foreground")}>
                        {t.type === "income" ? "+" : "-"}{brl(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => categorizeWithAi(t.id)}
                            disabled={categorizingId === t.id}
                            className="rounded-lg p-1.5 text-faint transition hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                            aria-label={`Categorizar ${t.description} com IA`}
                            title="Categorizar com IA"
                          >
                            <Sparkles className={cn("h-4 w-4", categorizingId === t.id && "animate-pulse")} />
                          </button>
                          <button
                            onClick={() => { setEditing(t); setFormOpen(true); }}
                            className="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-foreground"
                            aria-label={`Editar ${t.description}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            className="rounded-lg p-1.5 text-faint transition hover:bg-danger/10 hover:text-danger"
                            aria-label={`Excluir ${t.description}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {filtered.map((t) => {
              const cat = t.category_id ? catMap.get(t.category_id) : undefined;
              const card = t.card_id ? cardMap.get(t.card_id) : undefined;
              return (
                <div key={t.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.type === "income" ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                    {t.type === "income" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{t.description}</p>
                    <p className="text-[11px] text-faint">
                      {fmtDateShort(t.date)}
                      {cat ? ` • ${cat.name}` : ""}
                      {card ? ` • ${card.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-[13px] font-semibold tabular-nums", t.type === "income" ? "text-success" : "text-foreground")}>
                      {t.type === "income" ? "+" : "-"}{brl(t.amount)}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => categorizeWithAi(t.id)}
                        disabled={categorizingId === t.id}
                        className="text-faint disabled:opacity-50"
                        aria-label={`Categorizar ${t.description} com IA`}
                        title="Categorizar com IA"
                      >
                        <Sparkles className={cn("h-3.5 w-3.5", categorizingId === t.id && "animate-pulse")} />
                      </button>
                      <button onClick={() => { setEditing(t); setFormOpen(true); }} className="text-faint" aria-label={`Editar ${t.description}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleting(t)} className="text-faint" aria-label={`Excluir ${t.description}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        categories={cats.data}
        cards={cards.data}
        onSaved={() => tx.refetch()}
      />

      <CategoriesManager
        open={catsOpen}
        onOpenChange={setCatsOpen}
        categories={cats.data}
        onSaved={() => cats.refetch()}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingLoading}
        title="Excluir transação"
        description={deleting ? `Tem certeza que deseja excluir "${deleting.description}"?` : ""}
      />
    </div>
  );
}