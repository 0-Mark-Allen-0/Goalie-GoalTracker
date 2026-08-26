// frontend/src/lib/splits.ts
// Conversions between the split editor's draft rows and the API's Split[].
import type { Split } from "@/api/types";
import { minorToInput, parseMoneyInput, type MoneyFormat } from "@/lib/money";

/** A row in the income picker: the amount is still raw text the user is typing. */
export interface DraftSplit {
  incomeId: string;
  text: string;
}

/** Turns editor rows into an API payload, dropping blank or zero rows. */
export function toSplits(splits: DraftSplit[], format: MoneyFormat): Split[] {
  return splits
    .map((split) => ({
      incomeId: split.incomeId,
      amount: parseMoneyInput(split.text, format) ?? 0,
    }))
    .filter((split) => split.incomeId && split.amount > 0);
}

export function splitsTotal(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + split.amount, 0);
}

/** Seeds the editor from an existing entry or goal breakdown when opening it for edit. */
export function toDraftSplits(splits: Split[]): DraftSplit[] {
  return splits.map((split) => ({
    incomeId: split.incomeId,
    text: minorToInput(split.amount),
  }));
}
