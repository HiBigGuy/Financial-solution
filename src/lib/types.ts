export type TransactionType = "income" | "expense";
export type Recurrence = "none" | "fixed" | "installments";
export type IncomeSourceKind = "salario" | "freela" | "extra";
export type IncomeFrequency = "monthly" | "fifteen" | "weekly" | "one-time";
export type InvestmentType =
  | "acao"
  | "fii"
  | "tesouro"
  | "renda-fixa"
  | "cripto";
export type CardType = "credit" | "debit";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: TransactionType;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category_id: string | null;
  card_id: string | null;
  tags: string[];
  date: string;
  recurrence: Recurrence;
  installment_no: number | null;
  installment_total: number | null;
  created_at: string;
  category?: Category | null;
  card?: Card | null;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  kind: IncomeSourceKind;
  amount: number;
  frequency: IncomeFrequency;
  active: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  type: CardType;
  last4: string | null;
  limit_amount: number;
  closing_day: number | null;
  due_day: number | null;
  color: string;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  avg_price: number;
  current_price: number;
  acquired_at: string;
  notes: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  due_date: string | null;
  category: string;
  color: string;
  created_at: string;
}

export interface MonthData {
  key: string;
  label: string;
  short: string;
  date: Date;
  income: number;
  expense: number;
  net: number;
}

export interface BalanceRow {
  monthKey: string;
  balance: number;
}