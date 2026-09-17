import { useMemo, useState } from "react";
import { ArrowDownLeft, BadgeDollarSign, CalendarClock, Pencil, Plus, Trash2, TrendingUp, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRows } from "@/hooks/use-rows";
import { useAuth } from "@/features/auth/useAuth";
import type { IncomeSource, Transaction } from "@/lib/types";
import { IncomeSourceKind, IncomeFrequency } from "@/lib/types";
import { brl } from "@/lib/format";
import { aggregateByMonth } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AreaEvolution } from "@/components/charts/AreaEvolution";
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

const KIND_LABEL: Record<IncomeSourceKind, string> = {
  salario: "Salário",
  freela: "Freela",
  extra: "Rendimento extra",
};
const FREQ_LABEL: Record<IncomeFrequency, string> = {
  monthly: "Mensal",
  fifteen: "Quinzenal",
  weekly: "Semanal",
  "one-time": "Única",
};

interface SourceFormState {
  open: boolean;
  source: IncomeSource | null;
  name: string;
  kind: IncomeSourceKind;
  amount: string;
  frequency: IncomeFrequency;
  active: boolean;
}

const emptyForm: SourceFormState = {
  open: false,
  source: null,
  name: "",
  kind: "salario",
  amount: "",
  frequency: "monthly",
  active: true,
};

function estimateMonthly(source: IncomeSource): number {
  switch (source.frequency) {
    case "monthly":
      return source.amount;
    case "fifteen":
      return source.amount * 2;
    case "weekly":
      return source.amount * 4.33;
    case "one-time":
      return 0;
  }
}

export function SalaryPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<SourceFormState>(emptyForm);
  const [deleting, setDeleting] = useState<IncomeSource | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sources = useRows<IncomeSource>("income_sources", {
    orderBy: { column: "created_at", ascending: true },
  });
  const txs = useRows<Transaction>("transactions", {
    orderBy: { column: "date" },
  });

  const incomeTxs = useMemo(() => txs.data.filter((t) => t.type === "income"), [txs.data]);

  const monthly = useMemo(() => {
    const agg = aggregateByMonth(incomeTxs, 12);
    return agg.map((m) => ({ label: m.short, value: m.income }));
  }, [incomeTxs]);

  const receivedThisMonth = monthly.at(-1)?.value ?? 0;
  const lastMonth = monthly.at(-2)?.value ?? 0;
  const avg6 = useMemo(() => {
    const last6 = monthly.slice(-6);
    const sum = last6.reduce((s, m) => s + m.value, 0);
    return last6.length ? sum / last6.length : 0;
  }, [monthly]);

  const expectedMonthly = useMemo(
    () => sources.data.filter((s) => s.active).reduce((s, src) => s + estimateMonthly(src), 0),
    [sources.data]
  );

  const openNew = () => setForm({ ...emptyForm, open: true });
  const openEdit = (s: IncomeSource) =>
    setForm({
      open: true,
      source: s,
      name: s.name,
      kind: s.kind,
      amount: String(s.amount),
      frequency: s.frequency,
      active: s.active,
    });

  const save = async () => {
    if (!supabase || !user) return;
    if (!form.name.trim()) return;
    const amount = parseFloat(form.amount.replace(",", ".")) || 0;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      amount,
      frequency: form.frequency,
      active: form.active,
    };
    const { error } = form.source
      ? await supabase.from("income_sources").update(payload).eq("id", form.source.id)
      : await supabase.from("income_sources").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(form.source ? "Fonte atualizada" : "Fonte criada");
    setForm(emptyForm);
    sources.refetch();
  };

  const confirmDelete = async () => {
    if (!deleting || !supabase) return;
    setDeletingLoading(true);
    const { error } = await supabase.from("income_sources").delete().eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Fonte excluída");
    setDeleting(null);
    sources.refetch();
  };

  const loading = sources.loading || txs.loading;

  return (
    <div>
      <PageHeader
        title="Salário"
        description="Suas fontes de renda e a evolução dos recebimentos"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova fonte
          </Button>
        }
      />

      {/* Cards resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Renda mensal estimada"
          value={brl(expectedMonthly)}
          hint={sources.data.filter((s) => s.active).length + " fontes ativas"}
          icon={<Briefcase className="h-4 w-4" />}
          iconTone="brand"
          loading={loading}
        />
        <MetricCard
          label="Recebido no mês"
          value={brl(receivedThisMonth)}
          variation={lastMonth > 0 ? ((receivedThisMonth - lastMonth) / lastMonth) * 100 : null}
          icon={<ArrowDownLeft className="h-4 w-4" />}
          iconTone="success"
          loading={loading}
        />
        <MetricCard
          label="Média (6 meses)"
          value={brl(avg6)}
          icon={<TrendingUp className="h-4 w-4" />}
          iconTone="purple"
          loading={loading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Evolução da renda */}
        <ChartCardShell className="xl:col-span-2" title="Evolução da renda" subtitle="Últimos 12 meses">
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : incomeTxs.length > 0 ? (
            <AreaEvolution
              data={monthly}
              color="var(--success)"
              formatValue={(v) => brl(v)}
              badge={undefined}
            />
          ) : (
            <EmptyState
              title="Ainda sem receitas"
              description="Seus recebimentos registrados em Transações aparecerão aqui."
            />
          )}
        </ChartCardShell>

        {/* Fontes */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Fontes de renda</CardTitle>
            <span className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">
              {sources.data.length}
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : sources.data.length === 0 ? (
              <EmptyState
                title="Nenhuma fonte"
                description="Cadastre seu salário fixo, freelas e rendas extras."
                className="min-h-[180px]"
                action={
                  <Button size="sm" onClick={openNew}>
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                }
              />
            ) : (
              sources.data.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <BadgeDollarSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{s.name}</p>
                    <p className="text-[11px] text-faint">
                      {KIND_LABEL[s.kind]} • {FREQ_LABEL[s.frequency]}
                      {!s.active ? " • inativa" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-foreground">{brl(s.amount)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-foreground" aria-label={`Editar ${s.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleting(s)} className="rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger" aria-label={`Excluir ${s.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico mensal */}
      <div className="mt-4">
        <ChartCardShell title="Histórico mensal" subtitle="Recebimentos por mês">
          {loading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : incomeTxs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {monthly.map((m) => (
                <div key={m.label} className="rounded-xl border border-border p-3 text-center">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{m.label}</p>
                  <p className={cn("mt-1 text-[13px] font-semibold tabular-nums", m.value > 0 ? "text-foreground" : "text-faint")}>
                    {m.value > 0 ? brl(m.value) : "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-[12px] text-faint">
              <CalendarClock className="mx-auto mb-2 h-6 w-6" />
              Nenhum recebimento registrado nos últimos 12 meses.
            </p>
          )}
        </ChartCardShell>
      </div>

      {/* Modal Fonte de renda */}
      <Dialog open={form.open} onOpenChange={(v) => !v && setForm(emptyForm)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{form.source ? "Editar fonte" : "Nova fonte de renda"}</DialogTitle>
            <DialogDescription>Salário fixo, freelas e rendimentos extras.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="src-name">Nome</Label>
              <Input id="src-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Salário CLT" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as IncomeSourceKind })}>
                  <SelectTrigger aria-label="Tipo de renda">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(KIND_LABEL) as IncomeSourceKind[]).map((k) => (
                      <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as IncomeFrequency })}>
                  <SelectTrigger aria-label="Frequência">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQ_LABEL) as IncomeFrequency[]).map((k) => (
                      <SelectItem key={k} value={k}>{FREQ_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="src-amount">Valor (R$)</Label>
              <Input id="src-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputMode="decimal" placeholder="0,00" />
            </div>
            <button
              onClick={() => setForm({ ...form, active: !form.active })}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-[13px]",
                form.active ? "text-foreground" : "text-faint"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4" />
                Fonte ativa (conta na estimativa mensal)
              </span>
              <span className={cn("h-2.5 w-2.5 rounded-full", form.active ? "bg-success" : "bg-surface-3")} />
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(emptyForm)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : form.source ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingLoading}
        title="Excluir fonte de renda"
        description={deleting ? `Excluir "${deleting.name}" da sua lista de fontes?` : ""}
      />
    </div>
  );
}