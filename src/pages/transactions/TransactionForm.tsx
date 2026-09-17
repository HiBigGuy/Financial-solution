import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";
import type { Transaction, Category, Card, Recurrence, TransactionType } from "@/lib/types";
import { NOW_ISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const moneyInput = "h-12 rounded-[10px] border border-border bg-surface-2 px-3 text-right text-[18px] font-semibold tracking-tight text-foreground placeholder:text-faint outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20";

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
  cards,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  cards: Card[];
  onSaved: () => void;
}) {
  const { user } = useAuth();

  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState(NOW_ISO);
  const [categoryId, setCategoryId] = useState<string>("");
  const [cardId, setCardId] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [instNo, setInstNo] = useState("1");
  const [instTotal, setInstTotal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? "expense");
    setDescription(transaction?.description ?? "");
    setAmountRaw(transaction ? String(transaction.amount) : "");
    setDate(transaction?.date ?? NOW_ISO);
    setCategoryId(transaction?.category_id ?? "");
    setCardId(transaction?.card_id ?? "");
    setTagsRaw(transaction?.tags?.join(", ") ?? "");
    setRecurrence(transaction?.recurrence ?? "none");
    setInstNo(transaction?.installment_no ? String(transaction.installment_no) : "1");
    setInstTotal(transaction?.installment_total ? String(transaction.installment_total) : "");
  }, [open, transaction]);

  const filteredCats = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );
  const amount = parseMoney(amountRaw);

  const save = async () => {
    if (!supabase || !user) return;
    if (!description.trim()) {
      toast.error("Informe uma descrição");
      return;
    }
    if (amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    const payload = {
      type,
      description: description.trim(),
      amount,
      date,
      category_id: categoryId || null,
      card_id: cardId || null,
      tags: tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      recurrence,
      installment_no: recurrence === "installments" ? Number(instNo) || 1 : null,
      installment_total: recurrence === "installments" ? Number(instTotal) || null : null,
    };

    setSaving(true);
    const { error } = transaction
      ? await supabase.from("transactions").update(payload).eq("id", transaction.id)
      : await supabase.from("transactions").insert({ ...payload, user_id: user.id });
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar");
      return;
    }
    toast.success(transaction ? "Transação atualizada" : "Transação criada");
    onOpenChange(false);
    onSaved();
  };

  const typeBtn = (t: TransactionType, label: string) => (
    <button
      type="button"
      onClick={() => setType(t)}
      className={cn(
        "flex-1 rounded-lg py-2 text-[13px] font-medium transition",
        type === t
          ? t === "income"
            ? "bg-success text-white"
            : "bg-danger text-white"
          : "text-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>
            Registre receitas e despesas com categoria, recorrência e tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {typeBtn("expense", "Despesa")}
            {typeBtn("income", "Receita")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Descrição</Label>
            <Input
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Aluguel, Salário, Netflix…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">Valor (R$)</Label>
            <input
              id="tx-amount"
              className={moneyInput}
              style={{ width: "100%" }}
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger aria-label="Categoria" className="px-0">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cartão (só despesa) */}
          {type === "expense" && cards.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Cartão</Label>
              <Select value={cardId || "none"} onValueChange={(v) => setCardId(v === "none" ? "" : v)}>
                <SelectTrigger aria-label="Cartão">
                  <SelectValue placeholder="Sem cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cartão</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.last4 ? ` •••• ${c.last4}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Recorrência */}
          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
              <SelectTrigger aria-label="Recorrência">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Única</SelectItem>
                <SelectItem value="fixed">Fixa (todo mês)</SelectItem>
                <SelectItem value="installments">Parcelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence === "installments" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-inst-no">Parcela atual</Label>
                <Input id="tx-inst-no" type="number" min={1} value={instNo} onChange={(e) => setInstNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-inst-total">Total de parcelas</Label>
                <Input id="tx-inst-total" type="number" min={1} value={instTotal} onChange={(e) => setInstTotal(e.target.value)} />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="tx-tags">Tags</Label>
            <Textarea
              id="tx-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="Separe por vírgula: essencial, lazer, casa"
              className="min-h-[44px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : transaction ? "Salvar alterações" : "Criar transação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}