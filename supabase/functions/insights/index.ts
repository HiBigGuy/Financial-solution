import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { authorize } from "../_shared/supabase.ts";
import { generateInsight } from "../_shared/gemini.ts";

type Period = "week" | "month";

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function periodBounds(period: Period, offset = 0): { start: string; end: string; periodStart: string } {
  const now = new Date();
  if (period === "month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1));
    return { start: fmt(start), end: fmt(end), periodStart: fmt(start) };
  }
  const mondayOffset = (now.getUTCDay() + 6) % 7;
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset + offset * 7));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 7));
  return { start: fmt(base), end: fmt(end), periodStart: fmt(base) };
}

async function summarize(supabase: SupabaseClient, userId: string, period: Period, offset: number) {
  const { start, end } = periodBounds(period, offset);
  const { data: txs } = await supabase
    .from("transactions")
    .select("type, amount, category_id")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end);

  let income = 0;
  let expense = 0;
  const catTotals = new Map<string, number>();
  for (const t of txs ?? []) {
    const amount = Number(t.amount);
    if (t.type === "income") {
      income += amount;
    } else {
      expense += amount;
      if (t.category_id) catTotals.set(t.category_id as string, (catTotals.get(t.category_id as string) ?? 0) + amount);
    }
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);
  const nameById = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]));

  const byCategory = [...catTotals.entries()]
    .map(([id, total]) => ({ name: nameById.get(id) ?? "Sem categoria", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return { income, expense, byCategory };
}

async function generateForUser(supabase: SupabaseClient, userId: string, period: Period) {
  const current = await summarize(supabase, userId, period, 0);
  const previous = await summarize(supabase, userId, period, -1);
  const { periodStart } = periodBounds(period, 0);

  const content = await generateInsight({
    month: periodStart,
    income: current.income,
    expense: current.expense,
    byCategory: current.byCategory,
    prev: { income: previous.income, expense: previous.expense },
  });

  const { error } = await supabase
    .from("insights")
    .upsert(
      { user_id: userId, period, period_start: periodStart, content },
      { onConflict: "user_id,period,period_start" }
    );
  if (error) throw error;
  return content;
}

// Gera o resumo do período com IA e grava em `insights`.
// - Usuário autenticado: gera só para si.
// - Cron (x-cron-secret): gera para todos os usuários com conexões.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const auth = await authorize(req, { allowCron: true });
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const body = (await req.json().catch(() => ({}))) as { period?: Period };
    const period: Period = body.period === "month" ? "month" : "week";

    if (auth.mode === "user" && auth.userId) {
      const content = await generateForUser(auth.supabase, auth.userId, period);
      return json({ period, content });
    }

    const { data: connections } = await auth.supabase.from("bank_connections").select("user_id");
    const userIds = [...new Set((connections ?? []).map((c) => c.user_id as string))];
    const results: Record<string, string | null> = {};
    for (const userId of userIds) {
      try {
        results[userId] = await generateForUser(auth.supabase, userId, period);
      } catch (e) {
        console.error("Falha ao gerar insight", userId, e);
        results[userId] = null;
      }
    }
    return json({ period, users: userIds.length, results });
  } catch (e) {
    return errorResponse(e);
  }
});
