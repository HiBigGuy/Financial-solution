import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRows } from "@/hooks/use-rows";
import { useAuth } from "@/features/auth/useAuth";
import type { Investment } from "@/lib/types";
import { InvestmentType } from "@/lib/types";
import { brl, brlCompact, INVESTMENT_LABELS, NOW_ISO, signedBrl, signedPct } from "@/lib/format";
import { distributionByType, variationPct } from "@/lib/calculations";
import { SELECT_ITEMS } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TYPE_ICONS: Record<InvestmentType, string> = {
  acao: "📈",
  fii: "🏢",
  tesouro: "🏛️",
  "renda-fixa": "🔒",
  cripto: "🪙",
};

interface InvForm {
  open: boolean;
  inv: Investment | null;
  name: string;
  type: InvestmentType;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  acquiredAt: string;
  notes: string;
}

const emptyInv: InvForm = {
  open: false,
  inv: null,
  name: "",
  type: "acao",
  quantity: "1",
  avgPrice: "",
  currentPrice: "",
  acquiredAt: NOW_ISO,
  notes: "",
};

export function InvestmentsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<InvForm>(emptyInv);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const list = useRows<Investment>("investments", {
    orderBy: { column: "acquired_at", ascending: false },
  });
  const inv = list.data;

  const totalInvested = useMemo(() => inv.reduce((s, i) => s + i.quantity * i.avg_price, 0), [inv]);
  const currentValue = useMemo(() => inv.reduce((s, i) => s + i.quantity * i.current_price, 0), [inv]);
  const rentPct = variationPct(currentValue, totalInvested);
  const rentValue = currentValue - totalInvested;

  const distribution = useMemo(() => distributionByType(inv), [inv]);

  const openNew = () => setForm({ ...emptyInv, open: true });
  const openEdit = (x: Investment) =>
    setForm({
      open: true,
      inv: x,
      name: x.name,
      type: x.type,
      quantity: x.quantity.toString(),
      avgPrice: String(x.avg_price),
      currentPrice: String(x.current_price),
      acquiredAt: x.acquired_at,
      notes: x.notes ?? "",
    });

  const save = async () => {
    if (!supabase || !user) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      quantity: parseFloat(form.quantity.replace(",", ".")) || 0,
      avg_price: parseFloat(form.avgPrice.replace(",", ".")) || 0,
      current_price: parseFloat(form.currentPrice.replace(",", ".")) || 0,
      acquired_at: form.acquiredAt,
      notes: form.notes.trim() || null,
    };
    const { error } = form.inv
      ? await supabase.from("investments").update(payload).eq("id", form.inv.id)
      : await supabase.from("investments").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(form.inv ? "Ativo atualizado" : "Ativo adicionado");
    setForm(emptyInv);
    list.refetch();
  };

  const confirmDelete = async () => {
    if (!deleting || !supabase) return;
    setDeletingLoading(true);
    const { error } = await supabase.from("investments").delete().eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Ativo excluído");
    setDeleting(null);
    list.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Investimentos"
        description="Ativos, rentabilidade e distribuição por categoria"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo ativo
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Valor atual"
          value={brl(currentValue)}
          icon={<TrendingUp className="h-4 w-4" />}
          iconTone="brand"
          loading={list.loading}
        />
        <MetricCard
          label="Total investido"
          value={brl(totalInvested)}
          icon={<TrendingDown className="h-4 w-4" />}
          iconTone="purple"
          loading={list.loading}
        />
        <MetricCard
          label="Rentabilidade"
          value={brl(rentValue)}
          variation={rentPct}
          icon={<TrendingUp className="h-4 w-4" />}
          iconTone={rentPct >= 0 ? "success" : "danger"}
          loading={list.loading}
        />
        <MetricCard
          label="Ativos cadastrados"
          value={String(inv.length)}
          hint="em carteira"
          icon={<TrendingDown className="h-4 w-4" />}
          iconTone="orange"
          loading={list.loading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Tabela de ativos */}
        <div className="xl:col-span-2">
          {list.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : inv.length === 0 ? (
            <EmptyState
              title="Carteira vazia"
              description="Adicione ações, FIIs, tesouro direto, renda fixa ou cripto para acompanhar seus aportes."
              action={
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> Novo ativo
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[16px] border border-border">
              <div className="hidden md:block">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-faint">
                      <th className="px-4 py-3 font-medium">Ativo</th>
                      <th className="px-4 py-3 font-medium">Qtd.</th>
                      <th className="px-4 py-3 text-right font-medium">Custo</th>
                      <th className="px-4 py-3 text-right font-medium">Atual</th>
                      <th className="px-4 py-3 text-right font-medium">Retorno</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {inv.map((x) => {
                      const cost = x.quantity * x.avg_price;
                      const current = x.quantity * x.current_price;
                      const r = variationPct(current, cost);
                      return (
                        <tr key={x.id} className="border-b border-border/60 last:border-0 transition hover:bg-surface-2/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg leading-none">{TYPE_ICONS[x.type]}</span>
                              <div>
                                <p className="font-medium text-foreground">{x.name}</p>
                                <p className="text-[11px] text-faint">
                                  {INVESTMENT_LABELS[x.type]}
                                  {x.notes ? ` • ${x.notes}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted">
                            {x.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted">{brl(cost)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">{brl(current)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-end">
                              <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums", r >= 0 ? "text-success" : "text-danger")}>
                                {r >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {signedPct(r)}
                              </span>
                              <span className="text-[11px] text-faint">{signedBrl(current - cost)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(x)} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-foreground" aria-label={`Editar ${x.name}`}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleting(x)} className="rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger" aria-label={`Excluir ${x.name}`}>
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

              {/* mobile */}
              <div className="divide-y divide-border md:hidden">
                {inv.map((x) => {
                  const cost = x.quantity * x.avg_price;
                  const current = x.quantity * x.current_price;
                  const r = variationPct(current, cost);
                  return (
                    <div key={x.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                      <span className="text-lg leading-none">{TYPE_ICONS[x.type]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{x.name}</p>
                        <p className="text-[11px] text-faint">
                          {INVESTMENT_LABELS[x.type]} • {x.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} un.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-foreground">{brl(current)}</p>
                        <p className={cn("text-[11px] font-medium tabular-nums", r >= 0 ? "text-success" : "text-danger")}>
                          {signedPct(r)}
                        </p>
                      </div>
                      <button onClick={() => openEdit(x)} className="text-faint" aria-label={`Editar ${x.name}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Distribuição */}
        <ChartCardShell title="Distribuição" subtitle="Por categoria">
          {list.loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : inv.length > 0 ? (
            <DonutChart
              data={distribution.map((d) => ({
                name: INVESTMENT_LABELS[d.type as keyof typeof INVESTMENT_LABELS] ?? d.type,
                value: d.value,
                color: d.color,
              }))}
              centerValue={brlCompact(currentValue)}
              centerLabel="carteira"
            />
          ) : (
            <p className="py-10 text-center text-[12px] text-faint">Cadastre ativos para ver a distribuição.</p>
          )}
        </ChartCardShell>
      </div>

      {/* Modal Ativo */}
      <Dialog open={form.open} onOpenChange={(v) => !v && setForm(emptyInv)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{form.inv ? "Editar ativo" : "Novo ativo"}</DialogTitle>
            <DialogDescription>Informe quantidade, preço médio e preço atual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Nome</Label>
                <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: PETR4" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InvestmentType })}>
                  <SelectTrigger aria-label="Tipo de investimento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SELECT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-qty">Quantidade</Label>
                <Input id="inv-qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} inputMode="decimal" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-avg">Preço médio</Label>
                <Input id="inv-avg" value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cur">Preço atual</Label>
                <Input id="inv-cur" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-date">Data da aquisição</Label>
              <Input id="inv-date" type="date" value={form.acquiredAt} onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-notes">Anotações (opcional)</Label>
              <Input id="inv-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: estratégia, corretora…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(emptyInv)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : form.inv ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingLoading}
        title="Excluir ativo"
        description={deleting ? `Remover "${deleting.name}" da sua carteira?` : ""}
      />
    </div>
  );
}