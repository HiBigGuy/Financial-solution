import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  listAccounts,
  listAllTransactions,
  mapAccountType,
  toTransactionRow,
} from "./pluggy.ts";
import { classifyTransaction, type CategoryExample } from "./gemini.ts";

export interface BankConnection {
  id: string;
  user_id: string;
  item_id: string;
  last_sync_at: string | null;
}

const MAX_AI_CALLS = 25;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Busca as contas/cartões da conexão e sincroniza em `bank_accounts`. */
export async function syncAccounts(supabase: SupabaseClient, connection: BankConnection) {
  const { results } = await listAccounts(connection.item_id);
  const accounts = results ?? [];
  if (!accounts.length) return accounts;

  const rows = accounts.map((a) => ({
    user_id: connection.user_id,
    connection_id: connection.id,
    external_id: a.id,
    name: a.name ?? null,
    type: mapAccountType(a),
    subtype: a.subtype ?? null,
    currency: a.currencyCode ?? "BRL",
    balance: Number(a.balance ?? 0),
    credit_limit: a.creditData?.creditLimit ?? null,
  }));

  const { error } = await supabase
    .from("bank_accounts")
    .upsert(rows, { onConflict: "connection_id,external_id" });
  if (error) throw error;
  return accounts;
}

/** Mapeia e faz upsert idempotente das transações de todas as contas da conexão. */
export async function syncTransactions(
  supabase: SupabaseClient,
  connection: BankConnection,
  opts: { categorize?: boolean } = {}
): Promise<{ imported: number }> {
  const from = connection.last_sync_at ? connection.last_sync_at.slice(0, 10) : isoDaysAgo(90);

  const { data: accounts, error: accErr } = await supabase
    .from("bank_accounts")
    .select("id, external_id")
    .eq("connection_id", connection.id);
  if (accErr) throw accErr;

  let imported = 0;
  for (const account of accounts ?? []) {
    const txs = await listAllTransactions(account.external_id as string, from);
    const rows = txs
      .map((tx) => toTransactionRow(connection.user_id, account.id as string, tx))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length) {
      const { error } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,external_id" });
      if (error) throw error;
      imported += rows.length;
    }
  }

  if (opts.categorize !== false) {
    await categorizeUncategorized(supabase, connection.user_id, MAX_AI_CALLS);
  }
  return { imported };
}

/** Categoriza via IA as transações importadas que ainda estão sem categoria. */
export async function categorizeUncategorized(
  supabase: SupabaseClient,
  userId: string,
  limit = MAX_AI_CALLS
): Promise<{ categorized: number }> {
  const { data: transactions, error: txErr } = await supabase
    .from("transactions")
    .select("id, description, amount, type")
    .eq("user_id", userId)
    .eq("source", "open_finance")
    .is("category_id", null)
    .limit(limit);
  if (txErr) throw txErr;
  if (!transactions?.length) return { categorized: 0 };

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", userId);
  if (catErr) throw catErr;
  if (!categories?.length) return { categorized: 0 };

  const { data: corrections } = await supabase
    .from("categorization_corrections")
    .select("description_raw, chosen_category_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const catNameById = new Map(categories.map((c) => [c.id as string, c.name as string]));
  const examples: CategoryExample[] = (corrections ?? [])
    .map((c) => ({
      description: c.description_raw as string,
      category: catNameById.get(c.chosen_category_id as string) ?? "",
    }))
    .filter((e) => e.category);

  let categorized = 0;
  for (const tx of transactions) {
    const kind = tx.type === "income" ? "income" : "expense";
    const options = categories
      .filter((c) => c.kind === kind)
      .map((c) => ({ id: c.id as string, name: c.name as string, kind: c.kind as "income" | "expense" }));
    if (!options.length) continue;

    try {
      const { categoryId, confidence } = await classifyTransaction({
        description: tx.description as string,
        amount: Number(tx.amount),
        kind,
        categories: options,
        examples,
      });
      if (!categoryId) continue;
      await supabase
        .from("transactions")
        .update({
          category_id: categoryId,
          category_source: "ai",
          ai_suggested_category_id: categoryId,
          ai_confidence: confidence,
        })
        .eq("id", tx.id);
      categorized += 1;
    } catch (e) {
      console.error("Falha ao categorizar transação", tx.id, e);
    }
  }
  return { categorized };
}

/** Conexões ativas — de um usuário (RLS) ou todas (cron, service role). */
export async function getConnections(
  supabase: SupabaseClient,
  userId: string | null
): Promise<BankConnection[]> {
  let query = supabase
    .from("bank_connections")
    .select("id, user_id, item_id, last_sync_at")
    .neq("status", "error");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BankConnection[];
}
