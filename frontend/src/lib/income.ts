// frontend/src/lib/income.ts
// Helpers for identifying an income lot on screen.
//
// There are far too many income lots to give each one its own hue, so colour comes
// from the income's CATEGORY and identity is carried by description + date. "Project
// for Mr. John · 14 Aug" is what makes a lot recognisable, not its colour.
import type { Entry, Income, Label } from "@/api/types";
import { colourForSlot } from "@/lib/palette";

/** A neutral for income with no category yet. */
export const UNCATEGORISED_COLOUR = "#8a857b";

export function labelsById(labels: Label[]): Map<string, Label> {
  return new Map(labels.map((label) => [label.id, label]));
}

export function incomeColour(
  income: Pick<Entry, "categoryId"> | undefined,
  labels: Map<string, Label>,
): string {
  if (!income?.categoryId) return UNCATEGORISED_COLOUR;
  const label = labels.get(income.categoryId);
  return label ? colourForSlot(label.colourSlot) : UNCATEGORISED_COLOUR;
}

export function shortDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function longDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Project for Mr. John · 14 Aug" — how a lot is named everywhere it is referenced. */
export function incomeTitle(income: Entry | Income | undefined, locale?: string): string {
  if (!income) return "Unknown income";
  return `${income.description} · ${shortDate(income.date, locale)}`;
}

export type IncomeSort = "newest" | "oldest" | "most-left" | "least-left";

export const INCOME_SORTS: { value: IncomeSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most-left", label: "Most unspent" },
  { value: "least-left", label: "Least unspent" },
];

export function sortIncomes(incomes: Income[], sort: IncomeSort): Income[] {
  const copy = [...incomes];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.date.localeCompare(b.date));
    case "most-left":
      return copy.sort((a, b) => b.remaining - a.remaining);
    case "least-left":
      return copy.sort((a, b) => a.remaining - b.remaining);
    default:
      return copy.sort((a, b) => b.date.localeCompare(a.date));
  }
}
