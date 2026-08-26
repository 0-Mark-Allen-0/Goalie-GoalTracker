// frontend/src/components/form-controls.tsx
// Money input, label picker, and the income picker that answers "spent from what?".
import { useMemo, useState } from "react";
import { Plus, Split as SplitIcon, X } from "lucide-react";

import { createLabel } from "@/api";
import type { Income, Label as LabelModel, LabelKind } from "@/api/types";
import { qk, useLabels, useSimpleMutation } from "@/hooks/queries";
import {
  INCOME_SORTS,
  incomeColour,
  incomeTitle,
  labelsById,
  shortDate,
  sortIncomes,
  type IncomeSort,
} from "@/lib/income";
import {
  formatMoney,
  formatMoneyCompact,
  parseMoneyInput,
  type MoneyFormat,
} from "@/lib/money";
import { SOURCE_COLOURS, colourForSlot, nextFreeSlot } from "@/lib/palette";
import type { DraftSplit } from "@/lib/splits";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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

const NONE = "__none__";
const NEW = "__new__";

// --- Money input -------------------------------------------------------------

interface MoneyInputProps {
  value: string;
  onChange: (text: string) => void;
  format: MoneyFormat;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  max?: number;
  maxLabel?: string;
}

/**
 * Takes plain digits and shows a live formatted preview underneath — typing 500000
 * reads back as "₹5,00,000 · 5L". That is where the abbreviation belongs: readable
 * confirmation at entry time, without the ambiguity of parsing "5L" as input.
 */
export function MoneyInput({
  value,
  onChange,
  format,
  placeholder = "0",
  autoFocus,
  className,
  max,
  maxLabel,
}: MoneyInputProps) {
  const minor = parseMoneyInput(value, format);
  const compact = minor !== null ? formatMoneyCompact(minor, format) : null;
  const exact = minor !== null ? formatMoney(minor, format) : null;
  const overMax = minor !== null && max !== undefined && minor > max;

  return (
    <div className="space-y-1.5">
      <Input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "field tabular text-lg font-semibold",
          overMax && "border-critical text-critical",
          className,
        )}
      />
      {minor !== null && (
        <p
          className={cn(
            "text-xs font-medium tabular pl-1",
            overMax ? "text-critical" : "text-ink-3",
          )}
        >
          {exact}
          {compact !== exact && ` · ${compact}`}
        </p>
      )}
      {overMax && maxLabel && (
        <p className="text-xs font-semibold text-critical pl-1">{maxLabel}</p>
      )}
    </div>
  );
}

// --- Colour picker (income categories only) ----------------------------------

export function ColourPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (slot: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SOURCE_COLOURS.map((colour) => (
        <button
          key={colour.slot}
          type="button"
          aria-label={colour.name}
          onClick={() => onChange(colour.slot)}
          className={cn(
            "w-8 h-8 rounded-full transition-transform duration-[--motion-fast]",
            value === colour.slot
              ? "ring-2 ring-offset-2 ring-ink-1 scale-110"
              : "hover:scale-105",
          )}
          style={{ backgroundColor: colour.hex }}
        />
      ))}
    </div>
  );
}

// --- Label picker ------------------------------------------------------------

const KIND_NOUN: Record<LabelKind, string> = {
  income_category: "income category",
  expense_category: "category",
  account: "account",
};

interface LabelSelectProps {
  kind: LabelKind;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

/**
 * All three label kinds share this control. "None" is always available: an account
 * records where cash landed, and nobody should be forced to remember that to log an
 * expense.
 */
export function LabelSelect({ kind, value, onChange, placeholder }: LabelSelectProps) {
  const { data: labels = [] } = useLabels(kind);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [slot, setSlot] = useState(0);

  const noun = KIND_NOUN[kind];
  const coloured = kind === "income_category";

  const createMutation = useSimpleMutation(
    async (name: string) =>
      (await createLabel({ name, kind, colourSlot: coloured ? slot : 0 })).data,
    [qk.labels(kind), qk.labels()],
    {
      successMessage: "Added.",
      onSuccess: (created: LabelModel) => {
        onChange(created.id);
        setCreating(false);
        setDraft("");
      },
    },
  );

  return (
    <>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => {
          if (next === NEW) {
            setSlot(nextFreeSlot(labels.map((label) => label.colourSlot)));
            setCreating(true);
            return;
          }
          onChange(next === NONE ? null : next);
        }}
      >
        <SelectTrigger className="field w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-hairline bg-white">
          <SelectItem value={NONE}>
            <span className="text-ink-3">No {noun}</span>
          </SelectItem>
          {labels.map((label) => (
            <SelectItem key={label.id} value={label.id}>
              <span className="flex items-center gap-2">
                {coloured && (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colourForSlot(label.colourSlot) }}
                  />
                )}
                {label.name}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={NEW}>
            <span className="font-semibold text-brand">+ New {noun}</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-sm max-h-[88vh] overflow-y-auto no-scrollbar rounded-[32px] bg-canvas border-hairline p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-ink-1">New {noun}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4 pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) createMutation.mutate(draft.trim());
            }}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                kind === "income_category"
                  ? "e.g. Consulting"
                  : kind === "expense_category"
                    ? "e.g. Electronics"
                    : "e.g. HDFC Savings"
              }
              className="field"
            />
            {coloured && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-ink-2">Colour</Label>
                <ColourPicker value={slot} onChange={setSlot} />
              </div>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || createMutation.isPending}
              className="btn-primary w-full h-11"
            >
              {createMutation.isPending ? "Adding…" : "Add"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Income picker -----------------------------------------------------------

interface IncomePickerProps {
  incomes: Income[];
  splits: DraftSplit[];
  onChange: (splits: DraftSplit[]) => void;
  format: MoneyFormat;
  locale?: string;
  /** Extra headroom per income, used when completing a goal releases its reservations. */
  extraAllowance?: Record<string, number>;
  /** Warns when the entry is dated before the income it draws on. */
  entryDate?: string;
}

/**
 * Chooses WHICH earning this money is spent from. One row is the ordinary case; the
 * button adds more, which is how a single purchase can draw on August's freelance
 * payment and September's salary at once.
 *
 * The sort control matters: with hundreds of lots accumulated over years, "oldest
 * first" or "most unspent" is how you actually find the one you meant.
 */
export function IncomePicker({
  incomes,
  splits,
  onChange,
  format,
  locale,
  extraAllowance,
  entryDate,
}: IncomePickerProps) {
  const [sort, setSort] = useState<IncomeSort>("newest");
  const { data: categoryLabels = [] } = useLabels("income_category");
  const labelMap = useMemo(() => labelsById(categoryLabels), [categoryLabels]);

  const selectedIds = useMemo(
    () => new Set(splits.map((split) => split.incomeId)),
    [splits],
  );

  const headroomFor = (incomeId: string) => {
    const income = incomes.find((candidate) => candidate.id === incomeId);
    if (!income) return 0;
    return income.remaining + (extraAllowance?.[incomeId] ?? 0);
  };

  // Anything with money left, plus whatever is already selected — so editing an entry
  // still shows a fully-spent income it is currently drawing from.
  const options = useMemo(
    () =>
      sortIncomes(
        incomes.filter(
          (income) =>
            income.remaining > 0 ||
            selectedIds.has(income.id) ||
            (extraAllowance?.[income.id] ?? 0) > 0,
        ),
        sort,
      ),
    [incomes, sort, selectedIds, extraAllowance],
  );

  const update = (index: number, patch: Partial<DraftSplit>) => {
    onChange(splits.map((split, i) => (i === index ? { ...split, ...patch } : split)));
  };

  const total = splits.reduce(
    (sum, split) => sum + (parseMoneyInput(split.text, format) ?? 0),
    0,
  );
  const nextFree = options.find((income) => !selectedIds.has(income.id));

  if (options.length === 0) {
    return (
      <p className="text-sm font-medium text-ink-3 rounded-2xl bg-white/70 border border-white/80 p-4">
        No income has anything left to spend. Record some income first, or free money up
        from a goal.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {options.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-3 shrink-0">
            Sort
          </span>
          <Select value={sort} onValueChange={(next) => setSort(next as IncomeSort)}>
            <SelectTrigger className="field h-9 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-hairline bg-white">
              {INCOME_SORTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {splits.map((split, index) => {
        const income = incomes.find((candidate) => candidate.id === split.incomeId);
        const headroom = headroomFor(split.incomeId);
        const spentBeforeEarned = Boolean(
          entryDate && income && entryDate < income.date.slice(0, 10),
        );

        return (
          <div
            key={index}
            className="rounded-2xl bg-white/70 border border-white/80 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-[--motion-base]"
          >
            <div className="flex items-center gap-2">
              <Select
                value={split.incomeId}
                onValueChange={(next) => update(index, { incomeId: next })}
              >
                <SelectTrigger className="field flex-1">
                  <SelectValue placeholder="Choose an income" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-hairline bg-white max-h-72">
                  {options.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                      disabled={selectedIds.has(option.id) && option.id !== split.incomeId}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: incomeColour(option, labelMap) }}
                        />
                        <span className="truncate">{option.description}</span>
                        <span className="text-ink-3 tabular text-xs shrink-0">
                          {shortDate(option.date, locale)} ·{" "}
                          {formatMoney(option.remaining, format)} left
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {splits.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove this income"
                  onClick={() => onChange(splits.filter((_, i) => i !== index))}
                  className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-ink-3 hover:text-critical hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <MoneyInput
              value={split.text}
              onChange={(text) => update(index, { text })}
              format={format}
              max={headroom}
              maxLabel={`Only ${formatMoney(headroom, format)} of ${
                income ? `'${income.description}'` : "that income"
              } is left.`}
            />

            {income && (
              <p className="text-xs font-medium text-ink-3 tabular pl-1">
                {formatMoney(headroom, format)} left of {incomeTitle(income, locale)}
              </p>
            )}

            {spentBeforeEarned && (
              <p className="text-xs font-semibold text-warning pl-1">
                Heads up: this is dated before the income it is spent from.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3">
        {nextFree ? (
          <button
            type="button"
            onClick={() => onChange([...splits, { incomeId: nextFree.id, text: "" }])}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            {splits.length > 1 ? <Plus className="w-4 h-4" /> : <SplitIcon className="w-4 h-4" />}
            {splits.length > 1 ? "Add another income" : "Spend from another income"}
          </button>
        ) : (
          <span />
        )}

        {splits.length > 1 && (
          <span className="text-sm font-semibold text-ink-2 tabular">
            Total {formatMoney(total, format)}
          </span>
        )}
      </div>
    </div>
  );
}
