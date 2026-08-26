// frontend/src/api/types.ts
// Mirrors backend/models.py. Every amount is an integer in minor units (paise/cents).
//
// The central noun is an INCOME: one earning event, with its own date and its own
// balance. Expenses are SPENT FROM specific incomes, never from a shared pool.

export type EntryKind = "income" | "expense" | "reservation" | "release";
export type LabelKind = "income_category" | "expense_category" | "account";
export type GoalStatus = "active" | "completed" | "abandoned";

/** A draw against one income — "which earning did this money come from?". */
export interface Split {
  incomeId: string;
  amount: number;
}

/**
 * Income categories, expense categories and accounts share this shape. All three are
 * adjectives on an entry; only income categories use `colourSlot`, which is what
 * tints an income everywhere in the UI.
 */
export interface Label {
  id: string;
  name: string;
  kind: LabelKind;
  colourSlot: number;
  archived: boolean;
}

export interface Entry {
  id: string;
  kind: EntryKind;
  date: string;
  description: string;
  total: number;
  /** Empty for income: an income is a lot, not a draw against one. */
  splits: Split[];
  categoryId?: string | null;
  accountId?: string | null;
  goalId?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** An income lot plus its drawdown — how much of this earning is left. */
export interface Income extends Entry {
  spent: number;
  reserved: number;
  remaining: number;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  deadline?: string | null;
  status: GoalStatus;
  /** Reserved, not deducted: this money still belongs to the incomes it came from. */
  saved: number;
  breakdown: Split[];
  completedAt?: string | null;
  createdAt?: string | null;
}

export interface UserSettings {
  currency: string;
  locale: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
  settings: UserSettings;
}

export interface PnlPeriod {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface PnlReport {
  groupBy: "month" | "year";
  periods: PnlPeriod[];
  incomeByCategory: { categoryId: string | null; total: number }[];
  expenseByCategory: { categoryId: string | null; total: number }[];
  totals: { income: number; expense: number; net: number };
}

// --- Request payloads --------------------------------------------------------

export interface IncomePayload {
  date: string;
  description: string;
  amount: number;
  categoryId?: string | null;
  accountId?: string | null;
  note?: string | null;
}

export interface ExpensePayload {
  date: string;
  description: string;
  splits: Split[];
  categoryId?: string | null;
  accountId?: string | null;
  note?: string | null;
}

export interface GoalPayload {
  name: string;
  description?: string;
  targetValue: number;
  deadline?: string | null;
}

export interface ReservePayload {
  incomeId: string;
  amount: number;
}

export interface CompleteGoalPayload {
  actualAmount: number;
  date?: string;
  description?: string;
  categoryId?: string | null;
  accountId?: string | null;
  /** Omit to spend exactly what was reserved, income for income. */
  splits?: Split[];
}

export interface LedgerFilters {
  from?: string;
  to?: string;
  kind?: EntryKind;
  incomeId?: string;
  categoryId?: string;
  accountId?: string;
  goalId?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface IncomeFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
  unspent_only?: boolean;
  limit?: number;
}
