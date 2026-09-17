import { requireEnv } from "./supabase.ts";

/**
 * Cliente da API do Pluggy (Open Finance Brasil).
 * Docs: https://docs.pluggy.ai
 *
 * Nenhuma credencial bancária passa por aqui — o consentimento acontece no
 * Pluggy Connect Widget, no navegador do usuário. Guardamos apenas o itemId.
 */

const PLUGGY_BASE = "https://api.pluggy.ai";

export interface PluggyConnector {
  id?: string;
  name?: string;
  imageUrl?: string;
}

export interface PluggyItem {
  id: string;
  connector?: PluggyConnector;
  institutionId?: string;
  status?: string;
  consentExpiresAt?: string | null;
  error?: { message?: string; code?: string } | null;
}

export interface PluggyAccount {
  id: string;
  type: "BANK" | "CREDIT";
  subtype?: string | null;
  name?: string | null;
  number?: string | null;
  balance: number;
  currencyCode?: string | null;
  creditData?: { creditLimit?: number | null } | null;
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string;
  description?: string | null;
  descriptionRaw?: string | null;
  amount: number;
  type: "DEBIT" | "CREDIT";
  currencyCode?: string | null;
  category?: string | null;
  merchant?: { name?: string | null } | null;
}

interface PluggyPage<T> {
  results: T[];
  total?: number;
  totalPages?: number;
  page?: number;
}

let tokenCache: { apiKey: string; expiresAt: number } | null = null;

async function getApiKey(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.apiKey;
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: requireEnv("PLUGGY_CLIENT_ID"),
      clientSecret: requireEnv("PLUGGY_CLIENT_SECRET"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Pluggy auth falhou (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { apiKey: string };
  tokenCache = { apiKey: data.apiKey, expiresAt: Date.now() + 90 * 60 * 1000 };
  return data.apiKey;
}

async function pluggy<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${PLUGGY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Pluggy ${path} falhou (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export function createConnectToken(
  options: { itemId?: string; clientUserId?: string; options?: unknown } = {}
): Promise<{ accessToken: string }> {
  return pluggy<{ accessToken: string }>("/connect_token", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function getItem(itemId: string): Promise<PluggyItem> {
  return pluggy<PluggyItem>(`/items/${itemId}`);
}

export function listAccounts(itemId: string): Promise<PluggyPage<PluggyAccount>> {
  return pluggy<PluggyPage<PluggyAccount>>(`/accounts?itemId=${encodeURIComponent(itemId)}`);
}

function transactionsPage(
  accountId: string,
  opts: { from?: string; page?: number; pageSize?: number }
): Promise<PluggyPage<PluggyTransaction>> {
  const qs = new URLSearchParams({
    accountId,
    page: String(opts.page ?? 1),
    pageSize: String(opts.pageSize ?? 500),
  });
  if (opts.from) qs.set("from", opts.from);
  return pluggy<PluggyPage<PluggyTransaction>>(`/transactions?${qs.toString()}`);
}

export async function listAllTransactions(
  accountId: string,
  from: string,
  maxPages = 20
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await transactionsPage(accountId, { from, page });
    all.push(...(res.results ?? []));
    totalPages = res.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return all;
}

export function mapAccountType(account: PluggyAccount): "checking" | "savings" | "credit" | "investment" | "other" {
  if (account.type === "CREDIT") return "credit";
  const subtype = (account.subtype ?? "").toUpperCase();
  if (subtype.includes("SAVINGS")) return "savings";
  if (subtype.includes("INVESTMENT")) return "investment";
  if (subtype.includes("CHECKING") || account.type === "BANK") return "checking";
  return "other";
}

export function toTransactionRow(
  userId: string,
  accountId: string,
  tx: PluggyTransaction
): {
  user_id: string;
  account_id: string;
  external_id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date: string;
  source: "open_finance";
  category_source: "manual";
} | null {
  const amount = Math.abs(Number(tx.amount ?? 0));
  if (!tx.id || !amount) return null;
  const date = (tx.date ?? "").slice(0, 10);
  if (!date) return null;
  return {
    user_id: userId,
    account_id: accountId,
    external_id: tx.id,
    type: tx.type === "CREDIT" ? "income" : "expense",
    description: tx.description || tx.descriptionRaw || tx.merchant?.name || "Transação importada",
    amount,
    date,
    source: "open_finance",
    category_source: "manual",
  };
}
