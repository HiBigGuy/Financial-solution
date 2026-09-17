import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRows } from "@/hooks/use-rows";
import { useAuth } from "@/features/auth/useAuth";
import type { Card, Transaction, Category } from "@/lib/types";
import { CardType } from "@/lib/types";
import { brl, fmtDateShort, monthKey } from "@/lib/format";
import { expenseByCategory, invoicePeriod } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DonutChart } from "@/components/charts/DonutChart";
import { ChartCardShell } from "@/components/charts/ChartCardShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLOR_OPTIONS = ["#3b82f6", "#22c55e", "#8b5cf6", "#f97316", "#ec4899", "#06b6d4", "#64748b"];

interface CardForm {
  open: boolean;
  card: Card | null;
  name: string;
  brand: string;
  type: CardType;
  last4: string;
  limit: string;
  closingDay: string;
  dueDay: string;
  color: string;
}

const emptyCardForm: CardForm = {
  open: false,
  card: null,
  name: "",
  brand: "",
  type: "credit",
  last4: "",
  limit: "",
  closingDay: "",
  dueDay: "",
  color: COLOR_OPTIONS[0],
};

export function CardsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<CardForm>(emptyCardForm);
  const [deleting, setDeleting] = useState<Card | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const cards = useRows<Card>("cards", { orderBy: { column: "created_at" } });
  const txs = useRows<Transaction>("transactions", { orderBy: { column: "date", ascending: false } });
  const cats = useRows<Category>("categories", {});

  const selected = cards.data.find((c) => c.id === selectedId) ?? cards.data[0] ?? null;

  const cardTxs = useMemo(
    () => (selected ? txs.data.filter((t) => t.card_id === selected.id) : []),
    [txs.data, selected]
  );

  // Fatura atual (cartão de crédito)
  const invoice = useMemo(() => {
    if (!selected || selected.type !== "credit" || !selected.closing_day) return null;
    const { from, to } = invoicePeriod(selected.closing_day);
    const map: Record<string, Transaction[]> = {};
    for (const t of cardTxs) {
      const k = monthKey(t.date);
      (map[k] ??= []).push(t);
    }
    const total = cardTxs
      .filter((t) => {
        const d = new Date(t.date + "T12:00:00");
        const dFrom = new Date(from + "T12:00:00");
        const dTo = new Date(to + "T12:00:00");
        return d >= dFrom && d <= dTo && t.type === "expense";
      })
      .reduce((s, t) => s + t.amount, 0);
    void map;
    void from;
    return { total, period: `${fmtDateShort(from)} — ${fmtDateShort(to)}` };
  }, [selected, cardTxs]);

  const limitAvailable = selected && selected.type === "credit" ? Math.max(0, selected.limit_amount - (invoice?.total ?? 0)) : null;

  const distribution = useMemo(
    () =>
      selected
        ? expenseByCategory(
            cardTxs,
            cats.data.map((c) => ({ id: c.id, name: c.name, color: c.color })),
            undefined
          )
        : [],
    [cardTxs, cats.data, selected]
  );

  const catMap = useMemo(() => new Map(cats.data.map((c) => [c.id, c])), [cats.data]);

  const openNew = () => setForm({ ...emptyCardForm, open: true });
  const openEdit = (c: Card) =>
    setForm({
      open: true,
      card: c,
      name: c.name,
      brand: c.brand ?? "",
      type: c.type,
      last4: c.last4 ?? "",
      limit: String(c.limit_amount),
      closingDay: c.closing_day ? String(c.closing_day) : "",
      dueDay: c.due_day ? String(c.due_day) : "",
      color: c.color,
    });

  const save = async () => {
    if (!supabase || !user) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      type: form.type,
      last4: form.last4.trim().replace(/\D/g, "").slice(-4) || null,
      limit_amount: parseFloat(form.limit.replace(",", ".")) || 0,
      closing_day: form.closingDay ? Number(form.closingDay) : null,
      due_day: form.dueDay ? Number(form.dueDay) : null,
      color: form.color,
    };
    const { error } = form.card
      ? await supabase.from("cards").update(payload).eq("id", form.card.id)
      : await supabase.from("cards").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(form.card ? "Cartão atualizado" : "Cartão criado");
    setForm(emptyCardForm);
    cards.refetch();
  };

  const confirmDelete = async () => {
    if (!deleting || !supabase) return;
    setDeletingLoading(true);
    const { error } = await supabase.from("cards").delete().eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Cartão excluído");
    setDeleting(null);
    cards.refetch();
  };

  const loading = cards.loading || txs.loading;

  return (
    <div>
      <PageHeader
        title="Cartões"
        description="Crédito e débito com fatura, limite e categorização"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo cartão
          </Button>
        }
      />

      {/* Seletor de cartão (chips) */}
      {cards.data.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {cards.data.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition",
                selected?.id === c.id
                  ? "border-brand/40 bg-brand/10 text-foreground"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
              {c.last4 ? <span className="text-[11px] text-faint">•••• {c.last4}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : !selected ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Cadastre seus cartões de crédito ou débito para acompanhar faturas e gastos."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo cartão
            </Button>
          }
        />
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {selected.type === "credit" ? (
              <>
                <MetricCard
                  label="Fatura atual"
                  value={brl(invoice?.total ?? 0)}
                  hint={invoice ? invoice.period : "Defina o dia de fechamento"}
                  icon={<CreditCard className="h-4 w-4" />}
                  iconTone="brand"
                />
                <MetricCard
                  label="Limite disponível"
                  value={brl(limitAvailable ?? 0)}
                  hint={`de ${brl(selected.limit_amount)}`}
                  icon={<Wallet className="h-4 w-4" />}
                  iconTone="success"
                />
              </>
            ) : (
              <MetricCard
                label="Gastos no mês"
                value={brl(cardTxs.filter((t) => t.type === "expense" && monthKey(t.date) === monthKey(new Date())).reduce((s, t) => s + t.amount, 0))}
                icon={<Wallet className="h-4 w-4" />}
                iconTone="brand"
              />
            )}
            <MetricCard
              label="Total gasto"
              value={brl(cardTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))}
              icon={<CreditCard className="h-4 w-4" />}
              iconTone="purple"
            />
            <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface p-5 shadow-card">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-faint">Lançamentos</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{cardTxs.length}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(selected)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition hover:bg-surface-2 hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button onClick={() => setDeleting(selected)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-muted transition hover:bg-danger/10 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Gastos por categoria */}
            <ChartCardShell title="Categorização" subtitle="Gastos por categoria neste cartão">
              {distribution.length > 0 ? (
                <DonutChart
                  data={distribution.map((d) => ({ name: d.name, value: d.value, color: d.color }))}
                  centerValue={brl(distribution.reduce((s, d) => s + d.value, 0))}
                  centerLabel="gasto"
                />
              ) : (
                <p className="py-10 text-center text-[12px] text-faint">Nenhum gasto categorizado ainda.</p>
              )}
            </ChartCardShell>

            {/* Lançamentos do cartão */}
            <UICard className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Lançamentos</CardTitle>
                  <p className="mt-0.5 text-[11px] text-faint">Transações associadas a este cartão</p>
                </div>
                <Link to="/transacoes">
                  <Button variant="subtle" size="sm">
                    <Plus className="h-4 w-4" /> Lançar
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {cardTxs.length === 0 ? (
                  <EmptyState
                    title="Sem lançamentos"
                    description="Registre transações e selecione este cartão para vê-las aqui."
                    className="min-h-[180px]"
                  />
                ) : (
                  <div className="space-y-1">
                    {cardTxs.slice(0, 12).map((t) => {
                      const cat = t.category_id ? catMap.get(t.category_id) : undefined;
                      return (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2/50">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat?.color ?? "#64748b" }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-foreground">{t.description}</p>
                            <p className="text-[11px] text-faint">{fmtDateShort(t.date)}{cat ? ` • ${cat.name}` : ""}</p>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums text-danger">-{brl(t.amount)}</span>
                        </div>
                      );
                    })}
                    {cardTxs.length > 12 ? (
                      <p className="px-2 pt-2 text-[11px] text-faint">+ {cardTxs.length - 12} lançamentos</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </UICard>
          </div>
        </>
      )}

      {/* Modal Cartão */}
      <Dialog open={form.open} onOpenChange={(v) => !v && setForm(emptyCardForm)}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{form.card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
            <DialogDescription>Configure nome, tipo, limite e dias de fatura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cd-name">Nome</Label>
                <Input id="cd-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Nubank" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-brand">Bandeira (opcional)</Label>
                <Input id="cd-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Visa, Master…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CardType })}>
                  <SelectTrigger aria-label="Tipo do cartão">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd-last4">Final (4 dígitos)</Label>
                <Input id="cd-last4" value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value })} maxLength={4} placeholder="1234" />
              </div>
            </div>
            {form.type === "credit" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cd-limit">Limite (R$)</Label>
                  <Input id="cd-limit" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} inputMode="decimal" placeholder="0,00" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-closing">Dia de fechamento</Label>
                    <Input id="cd-closing" type="number" min={1} max={31} value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: e.target.value })} placeholder="5" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-due">Dia de vencimento</Label>
                    <Input id="cd-due" type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="12" />
                  </div>
                </div>
              </>
            ) : null}
            <div className="space-y-1.5">
              <Label>Cor do cartão</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn(
                      "h-7 w-7 rounded-full transition",
                      form.color === c && "ring-2 ring-foreground/40 ring-offset-2 ring-offset-surface"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(emptyCardForm)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : form.card ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingLoading}
        title="Excluir cartão"
        description={deleting ? `Excluir "${deleting.name}"? As transações vinculadas serão mantidas sem cartão.` : ""}
      />
    </div>
  );
}