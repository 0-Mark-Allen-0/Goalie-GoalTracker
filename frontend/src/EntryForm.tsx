// frontend/src/EntryForm.tsx
// One dialog for both sides of the ledger — but they are genuinely different shapes.
//
//   Income  : an amount and a date. It creates a lot.
//   Expense : picks which income(s) it is SPENT FROM. It draws against lots.
import { useEffect, useState } from "react";

import { createExpense, createIncome, updateExpense, updateIncome } from "@/api";
import type { Entry, Income } from "@/api/types";
import { useLedgerMutation } from "@/hooks/queries";
import { parseMoneyInput, minorToInput, type MoneyFormat } from "@/lib/money";
import { toDraftSplits, toSplits, type DraftSplit } from "@/lib/splits";
import { IncomePicker, LabelSelect, MoneyInput } from "@/components/form-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EntryKindLite = "income" | "expense";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `<input type="date">` works in YYYY-MM-DD; the API works in ISO instants. */
function toIsoDate(dateValue: string): string {
  return `${dateValue}T00:00:00Z`;
}

interface EntryFormProps {
  kind: EntryKindLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every income lot — an expense picks which of these it is spent from. */
  incomes: Income[];
  format: MoneyFormat;
  entry?: Entry | null;
}

export function EntryForm({
  kind,
  open,
  onOpenChange,
  incomes,
  format,
  entry,
}: EntryFormProps) {
  const isEdit = Boolean(entry);
  const isExpense = kind === "expense";

  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [amount, setAmount] = useState("");
  const [splits, setSplits] = useState<DraftSplit[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Re-seed whenever the dialog opens, so an edit never shows the previous entry.
  useEffect(() => {
    if (!open) return;
    if (entry) {
      setDescription(entry.description);
      setDate(entry.date.slice(0, 10));
      setAmount(minorToInput(entry.total));
      setSplits(toDraftSplits(entry.splits));
      setCategoryId(entry.categoryId ?? null);
      setAccountId(entry.accountId ?? null);
      setNote(entry.note ?? "");
    } else {
      setDescription("");
      setDate(todayInputValue());
      setAmount("");
      setSplits([]);
      setCategoryId(null);
      setAccountId(null);
      setNote("");
    }
  }, [open, entry]);

  // An expense needs a starting row; income needs none.
  useEffect(() => {
    if (!open || !isExpense || entry) return;
    setSplits((current) => {
      if (current.length > 0) return current;
      const first = incomes.find((income) => income.remaining > 0);
      return first ? [{ incomeId: first.id, text: "" }] : [];
    });
  }, [open, isExpense, entry, incomes]);

  const parsedAmount = parseMoneyInput(amount, format) ?? 0;
  const preparedSplits = toSplits(splits, format);

  const mutation = useLedgerMutation(
    async () => {
      const common = {
        date: toIsoDate(date),
        description: description.trim(),
        accountId,
        note: note.trim() || null,
      };

      if (isExpense) {
        const payload = { ...common, splits: preparedSplits, categoryId };
        return entry
          ? (await updateExpense(entry.id, payload)).data
          : (await createExpense(payload)).data;
      }

      const payload = { ...common, amount: parsedAmount, categoryId };
      return entry
        ? (await updateIncome(entry.id, payload)).data
        : (await createIncome(payload)).data;
    },
    {
      successMessage: isEdit
        ? "Entry updated."
        : isExpense
          ? "Expense recorded."
          : "Income recorded.",
      onSuccess: () => onOpenChange(false),
    },
  );

  const canSubmit =
    description.trim().length > 0 &&
    (isExpense ? preparedSplits.length > 0 : parsedAmount > 0) &&
    !mutation.isPending;

  const title = isEdit
    ? `Edit ${isExpense ? "expense" : "income"}`
    : isExpense
      ? "Record an expense"
      : "Record income";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto no-scrollbar rounded-[32px] bg-canvas border-hairline p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-ink-1">{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) mutation.mutate(undefined as void);
          }}
          className="space-y-5 pt-2"
        >
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">
              {isExpense ? "What did you buy?" : "How did you earn it?"}
            </Label>
            <Input
              autoFocus
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={isExpense ? "Watch" : "Project for Mr. John"}
              className="field"
            />
          </div>

          {isExpense ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">Spent from</Label>
              <IncomePicker
                incomes={incomes}
                splits={splits}
                onChange={setSplits}
                format={format}
                locale={format.locale}
                entryDate={date}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">Amount earned</Label>
              <MoneyInput value={amount} onChange={setAmount} format={format} />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">
                {isExpense ? "Date" : "Date earned"}
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="field"
              />
              {!isExpense && (
                <p className="text-xs text-ink-3">
                  When you earned it — this is how you will recognise the money later.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">
                {isExpense ? "Category" : "Income category"}
              </Label>
              <LabelSelect
                kind={isExpense ? "expense_category" : "income_category"}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="None"
              />
              {!isExpense && (
                <p className="text-xs text-ink-3">Sets this income&rsquo;s colour.</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-semibold text-ink-2">
                Account <span className="font-normal text-ink-3">(optional)</span>
              </Label>
              <LabelSelect
                kind="account"
                value={accountId}
                onChange={setAccountId}
                placeholder="No account"
              />
              <p className="text-xs text-ink-3">
                {isExpense ? "Which account you paid from." : "Where this cash landed."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">
              Note <span className="font-normal text-ink-3">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="rounded-2xl bg-white border-hairline resize-none"
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-primary w-full h-12">
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Record"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
