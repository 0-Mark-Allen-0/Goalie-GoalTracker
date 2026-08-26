// frontend/src/hooks/queries.ts
// All server state flows through here.
//
// Because every balance is DERIVED from the ledger, any mutation that moves money
// invalidates the whole set — incomes, goals, entries and the P&L alike. That is what
// `useLedgerMutation` is for: it removes the class of bug where a screen updates goals
// but leaves a stale "remaining" on an income card.
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  apiError,
  getCurrentUser,
  getEntries,
  getGoals,
  getIncomes,
  getLabels,
  getPnl,
} from "@/api";
import type { IncomeFilters, LabelKind, LedgerFilters } from "@/api/types";
import { DEFAULT_MONEY_FORMAT, type MoneyFormat } from "@/lib/money";

export const qk = {
  session: ["session"] as const,
  goals: ["goals"] as const,
  labels: (kind?: LabelKind) => (kind ? (["labels", kind] as const) : (["labels"] as const)),
  incomes: (filters: IncomeFilters) => ["incomes", filters] as const,
  entries: (filters: LedgerFilters) => ["entries", filters] as const,
  pnl: (params: Record<string, unknown>) => ["pnl", params] as const,
};

export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: async () => (await getCurrentUser()).data,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Currency + locale for every formatter on screen, with a safe default while loading. */
export function useMoneyFormat(): MoneyFormat {
  const { data } = useSession();
  return data?.settings ?? DEFAULT_MONEY_FORMAT;
}

export function useIncomes(filters: IncomeFilters = {}) {
  return useQuery({
    queryKey: qk.incomes(filters),
    queryFn: async () => (await getIncomes(filters)).data,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: qk.goals,
    queryFn: async () => (await getGoals()).data,
  });
}

export function useLabels(kind?: LabelKind) {
  return useQuery({
    queryKey: qk.labels(kind),
    queryFn: async () => (await getLabels(kind)).data,
  });
}

export function useEntries(filters: LedgerFilters = {}) {
  return useQuery({
    queryKey: qk.entries(filters),
    queryFn: async () => (await getEntries(filters)).data,
  });
}

export function usePnl(params: { from?: string; to?: string; groupBy?: "month" | "year" } = {}) {
  return useQuery({
    queryKey: qk.pnl(params),
    queryFn: async () => (await getPnl(params)).data,
  });
}

/**
 * Mutation wrapper for anything that touches money.
 *
 * Invalidates every derived key on success and surfaces the backend's `detail` message
 * on failure — those messages are written to be actionable ("'Project for Mr. John' is
 * short by 2,000"), so they belong in front of the user rather than behind a generic
 * "failed".
 */
export function useLedgerMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    successMessage?: string | ((data: TData) => string);
    errorMessage?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
  } & Omit<
    UseMutationOptions<TData, unknown, TVariables>,
    "mutationFn" | "onSuccess" | "onError"
  > = {},
) {
  const queryClient = useQueryClient();
  const { successMessage, errorMessage, onSuccess, ...rest } = options;

  return useMutation<TData, unknown, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: qk.goals });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["pnl"] });

      if (successMessage) {
        toast.success(
          typeof successMessage === "function" ? successMessage(data) : successMessage,
        );
      }
      onSuccess?.(data, variables);
    },
    onError: (error) => toast.error(apiError(error, errorMessage)),
    ...rest,
  });
}

/** Same error/toast handling, but for things that do not move money (labels, settings). */
export function useSimpleMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  keys: readonly (readonly unknown[])[],
  options: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
  } = {},
) {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      if (options.successMessage) toast.success(options.successMessage);
      options.onSuccess?.(data, variables);
    },
    onError: (error) => toast.error(apiError(error, options.errorMessage)),
  });
}
