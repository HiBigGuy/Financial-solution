import { useMemo, useState } from "react";
import { Pencil, PiggyBank, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRows } from "@/hooks/use-rows";
import { useAuth } from "@/features/auth/useAuth";
import type { Goal } from "@/lib/types";
import { brl, fmtDate, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GOAL_META: Record<string, { label: string; emoji: string }> = {
  emergency: { label: "Reserva de emergência", emoji: "🛡️" },
  travel: { label: "Viagem", emoji: "✈️" },
  purchase: { label: "Compra", emoji: "🛒" },
  investment: { label: "Investimento", emoji: "📈" },
  other: { label: "Outro", emoji: "🎯" },
};

const GOAL_COLORS = ["#3b82f6", "#22c55e", "#8b5cf6", "#f97316", "#ec4899", "#06b6d4"];

interface GoalForm {
  open: boolean;
  goal: Goal | null;
  name: string;
  target: string;
  current: string;
  dueDate: string;
  category: string;
  color: string;
}

const emptyGoal: GoalForm = {
  open: false,
  goal: null,
  name: "",
  target: "",
  current: "0",
  dueDate: "",
  category: "emergency",
  color: GOAL_COLORS[0],
};

export function GoalsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<GoalForm>(emptyGoal);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [contribute, setContribute] = useState<Goal | null>(null);
  const [contributeValue, setContributeValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const goals = useRows<Goal>("goals", { orderBy: { column: "created_at" } });

  const totals = useMemo(() => {
    let saved = 0;
    let target = 0;
    for (const g of goals.data) {
      saved += g.current_amount;
      target += g.target_amount;
    }
    return { saved, target, pct: target > 0 ? (saved / target) * 100 : 0 };
  }, [goals.data]);

  const progressFor = (g: Goal) =>
    g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;

  const daysLeft = (g: Goal) => {
    if (!g.due_date) return null;
    const diff = Math.ceil((parseDate(g.due_date).getTime() - Date.now()) / 86_400_000);
    return diff;
  };

  const openNew = () => setForm({ ...emptyGoal, open: true });
  const openEdit = (g: Goal) =>
    setForm({
      open: true,
      goal: g,
      name: g.name,
      target: String(g.target_amount),
      current: String(g.current_amount),
      dueDate: g.due_date ?? "",
      category: g.category,
      color: g.color,
    });

  const save = async () => {
    if (!supabase || !user) return;
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      target_amount: parseFloat(form.target.replace(",", ".")) || 0,
      current_amount: parseFloat(form.current.replace(",", ".")) || 0,
      due_date: form.dueDate || null,
      category: form.category,
      color: form.color,
    };
    const { error } = form.goal
      ? await supabase.from("goals").update(payload).eq("id", form.goal.id)
      : await supabase.from("goals").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(form.goal ? "Meta atualizada" : "Meta criada");
    setForm(emptyGoal);
    goals.refetch();
  };

  const applyContribution = async () => {
    if (!contribute || !supabase) return;
    const amt = parseFloat(contributeValue.replace(",", ".")) || 0;
    if (amt <= 0) return;
    setSaving(true);
    const { error } = await supabase
      .from("goals")
      .update({ current_amount: contribute.current_amount + amt })
      .eq("id", contribute.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível aportar");
      return;
    }
    toast.success(`Aporte de ${brl(amt)} registrado`);
    setContribute(null);
    setContributeValue("");
    goals.refetch();
  };

  const confirmDelete = async () => {
    if (!deleting || !supabase) return;
    setDeletingLoading(true);
    const { error } = await supabase.from("goals").delete().eq("id", deleting.id);
    setDeletingLoading(false);
    if (error) {
      toast.error("Não foi possível excluir");
      return;
    }
    toast.success("Meta excluída");
    setDeleting(null);
    goals.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Objetivos financeiros com progresso"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total guardado"
          value={brl(totals.saved)}
          icon={<PiggyBank className="h-4 w-4" />}
          iconTone="success"
          loading={goals.loading}
        />
        <MetricCard
          label="Meta total"
          value={brl(totals.target)}
          icon={<Wallet className="h-4 w-4" />}
          iconTone="brand"
          loading={goals.loading}
        />
        <MetricCard
          label="Progresso geral"
          value={`${totals.pct.toFixed(0).replace(".", ",")}%`}
          variation={null}
          hint={goals.data.length + " metas ativas"}
          icon={<TrendingUp className="h-4 w-4" />}
          iconTone="purple"
          loading={goals.loading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {goals.loading ? (
          <>
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </>
        ) : goals.data.length === 0 ? (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState
              title="Nenhuma meta criada"
              description="Reserva de emergência, viagem dos sonhos, um novo PC — defina o alvo e acompanhe o progresso."
              action={
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" /> Criar meta
                </Button>
              }
            />
          </div>
        ) : (
          goals.data.map((g) => {
            const meta = GOAL_META[g.category] ?? GOAL_META.other;
            const pct = progressFor(g);
            const dl = daysLeft(g);
            const done = pct >= 100;
            return (
              <div key={g.id} className="flex flex-col rounded-[16px] border border-border bg-surface p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-xl" aria-hidden="true">
                    {meta.emoji}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(g)} className="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-foreground" aria-label={`Editar ${g.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleting(g)} className="rounded-lg p-1.5 text-faint transition hover:bg-danger/10 hover:text-danger" aria-label={`Excluir ${g.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-[15px] font-semibold text-foreground">{g.name}</h3>
                <p className="text-[11px] text-faint">{meta.label}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[20px] font-semibold tabular-nums tracking-tight text-foreground">
                      {brl(g.current_amount)}
                    </span>
                    <span className="text-[12px] text-faint">
                      de {brl(g.target_amount)}
                    </span>
                  </div>
                  <Progress value={g.current_amount} max={g.target_amount} barColor={g.color} />
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold tabular-nums" style={{ color: g.color }}>
                      {pct.toFixed(0).replace(".", ",")}%
                    </span>
                    <span className="text-faint">
                      {done ? "Concluída 🎉" : dl === null ? "Sem prazo" : dl >= 0 ? `${dl} dias restantes` : "Prazo vencido"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 pt-3">
                  <Button size="sm" variant="outline" onClick={() => { setContribute(g); setContributeValue(""); }}>
                    <Plus className="h-4 w-4" /> Aportar
                  </Button>
                  {g.due_date ? (
                    <span className="ml-auto self-center text-[11px] text-faint">até {fmtDate(g.due_date)}</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Meta */}
      <Dialog open={form.open} onOpenChange={(v) => !v && setForm(emptyGoal)}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{form.goal ? "Editar meta" : "Nova meta"}</DialogTitle>
            <DialogDescription>Defina o valor alvo, o valor atual e o prazo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Nome</Label>
              <Input id="goal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Reserva de emergência" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Valor alvo (R$)</Label>
                <Input id="goal-target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-current">Valor atual (R$)</Label>
                <Input id="goal-current" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} inputMode="decimal" placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-date">Prazo</Label>
                <Input id="goal-date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  className="h-9 w-full rounded-[9px] border border-border bg-surface-2 px-2 text-[13px] text-foreground outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.entries(GOAL_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {GOAL_COLORS.map((c) => (
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
            <Button variant="ghost" onClick={() => setForm(emptyGoal)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : form.goal ? "Salvar" : "Criar meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal aporte */}
      <Dialog open={!!contribute} onOpenChange={(v) => !v && setContribute(null)}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Aportar em "{contribute?.name}"</DialogTitle>
            <DialogDescription>Atual o valor guardado nesta meta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ctr-value">Valor do aporte (R$)</Label>
            <Input id="ctr-value" value={contributeValue} onChange={(e) => setContributeValue(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContribute(null)}>Cancelar</Button>
            <Button onClick={applyContribution} disabled={saving || !contributeValue.trim()} variant={contribute && contribute.current_amount + (parseFloat(contributeValue.replace(",", ".")) || 0) >= contribute.target_amount ? "success" : "default"}>
              {saving ? "Salvando…" : "Registrar aporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingLoading}
        title="Excluir meta"
        description={deleting ? `Excluir a meta "${deleting.name}"?` : ""}
      />
    </div>
  );
}