// frontend/src/api/index.ts
// The single API layer. One axios instance, credentialed because the JWT lives in an
// httpOnly cross-site cookie.
import axios from "axios";
import type { AxiosError } from "axios";

import type {
  CompleteGoalPayload,
  CurrentUser,
  Entry,
  ExpensePayload,
  Goal,
  GoalPayload,
  Income,
  IncomeFilters,
  IncomePayload,
  Label,
  LabelKind,
  LedgerFilters,
  PnlReport,
  ReservePayload,
  UserSettings,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

/** Pulls FastAPI's `detail` out of an error so toasts can show something useful. */
export function apiError(error: unknown, fallback = "Something went wrong."): string {
  const detail = (error as AxiosError<{ detail?: unknown }>)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return fallback;
}

// --- Auth --------------------------------------------------------------------

export const getCurrentUser = () => api.get<CurrentUser>("/auth/me");
export const updateSettings = (settings: UserSettings) =>
  api.put<CurrentUser>("/auth/settings", settings);
export const logout = () => api.post<{ message: string }>("/auth/logout", {});
export const loginUrl = () => `${API_BASE_URL}/auth/google/login`;

// --- Labels (income categories, expense categories, accounts) ----------------

export const getLabels = (kind?: LabelKind) =>
  api.get<Label[]>("/labels/", { params: kind ? { kind } : undefined });
export const createLabel = (payload: {
  name: string;
  kind: LabelKind;
  colourSlot?: number;
}) => api.post<Label>("/labels/", payload);
export const updateLabel = (
  id: string,
  payload: Partial<{ name: string; colourSlot: number; archived: boolean }>,
) => api.put<Label>(`/labels/${id}`, payload);
export const deleteLabel = (id: string) =>
  api.delete<{ message: string; archived: boolean }>(`/labels/${id}`);

// --- Ledger ------------------------------------------------------------------

export const getEntries = (filters: LedgerFilters = {}) =>
  api.get<Entry[]>("/entries/", { params: filters });
/** Income lots, newest first, each with how much of it is still unspent. */
export const getIncomes = (filters: IncomeFilters = {}) =>
  api.get<Income[]>("/entries/income", { params: filters });
export const createIncome = (payload: IncomePayload) =>
  api.post<Income>("/entries/income", payload);
export const updateIncome = (id: string, payload: Partial<IncomePayload>) =>
  api.put<Income>(`/entries/income/${id}`, payload);
export const createExpense = (payload: ExpensePayload) =>
  api.post<Entry>("/entries/expense", payload);
export const updateExpense = (id: string, payload: Partial<ExpensePayload>) =>
  api.put<Entry>(`/entries/expense/${id}`, payload);
export const deleteEntry = (id: string) =>
  api.delete<{ message: string }>(`/entries/${id}`);
export const getPnl = (params: { from?: string; to?: string; groupBy?: "month" | "year" } = {}) =>
  api.get<PnlReport>("/entries/pnl", { params });

export const exportCsvUrl = (filters: LedgerFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return `${API_BASE_URL}/entries/export.csv${query ? `?${query}` : ""}`;
};

// --- Goals -------------------------------------------------------------------

export const getGoals = () => api.get<Goal[]>("/goals/");
export const createGoal = (payload: GoalPayload) => api.post<Goal>("/goals/", payload);
export const updateGoal = (id: string, payload: Partial<GoalPayload>) =>
  api.put<Goal>(`/goals/${id}`, payload);
export const deleteGoal = (id: string) =>
  api.delete<{ message: string; expensesKept: number }>(`/goals/${id}`);

export const reserveToGoal = (id: string, payload: ReservePayload) =>
  api.post<Goal>(`/goals/${id}/reserve`, payload);
export const releaseFromGoal = (id: string, payload: ReservePayload) =>
  api.post<Goal>(`/goals/${id}/release`, payload);

/** The ONLY thing that finishes a goal. Never fires automatically. */
export const completeGoal = (id: string, payload: CompleteGoalPayload) =>
  api.post<Goal>(`/goals/${id}/complete`, payload);
export const reopenGoal = (id: string) => api.post<Goal>(`/goals/${id}/reopen`);
export const abandonGoal = (id: string) => api.post<Goal>(`/goals/${id}/abandon`);

export * from "./types";
