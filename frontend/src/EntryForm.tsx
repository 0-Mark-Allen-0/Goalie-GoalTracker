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
import { FloatingInput, FloatingTextarea, RequiredMark } from "@/components/floating-field";
import { RecordFormDialog } from "@/components/record-form-dialog";

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

export function EntryForm({ open, onOpenChange, ...props }: EntryFormProps) {
  const title = props.entry
    ? `Edit ${props.kind}`
    : props.kind === "expense" ? "Record an expense" : "Record income";

  return (
    <RecordFormDialog open={open} onOpenChange={onOpenChange} title={title}>
      <EntryFields key={`${props.kind}:${props.entry?.id ?? "new"}`} {...props} onOpenChange={onOpenChange} />
    </RecordFormDialog>
  );
}

// The dialog mounts a fresh draft on open; edit values are ready on the first paint.
function EntryFields({ kind, onOpenChange, incomes, format, entry }: Omit<EntryFormProps, "open">) {
  const isEdit = Boolean(entry);
  const isExpense = kind === "expense";

  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(() => entry?.date.slice(0, 10) ?? todayInputValue());
  const [amount, setAmount] = useState(() => entry ? minorToInput(entry.total) : "");
  const firstIncomeId = isExpense && !entry ? incomes.find((income) => income.remaining > 0)?.id : undefined;
  const [splits, setSplits] = useState<DraftSplit[]>(() => {
    if (entry) return toDraftSplits(entry.splits);
    return firstIncomeId ? [{ incomeId: firstIncomeId, text: "" }] : [];
  });
  const [categoryId, setCategoryId] = useState<string | null>(entry?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string | null>(entry?.accountId ?? null);
  const [note, setNote] = useState(entry?.note ?? "");

  // Also seed the first row if incomes arrive after an expense form has opened.
  useEffect(() => {
    if (firstIncomeId) {
      setSplits((current) => current.length > 0 ? current : [{ incomeId: firstIncomeId, text: "" }]);
    }
  }, [firstIncomeId]);

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

  const dateField = (
    <FloatingInput label="Date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
  );
  const categoryField = (
    <LabelSelect
      label="Category"
      kind={isExpense ? "expense_category" : "income_category"}
      value={categoryId}
      onChange={setCategoryId}
    />
  );
  const accountField = (
    <LabelSelect label="Account" kind="account" value={accountId} onChange={setAccountId} />
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) mutation.mutate(undefined as void);
      }}
      className="record-form"
    >
      <FloatingInput
        label={isExpense ? "What did you buy?" : "How did you earn it?"}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={isExpense ? "Watch" : "Project for Mr. John"}
        required
      />

      {isExpense ? (
        <>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-semibold text-ink-2">
              Spent from<RequiredMark /><span className="sr-only"> (required)</span>
            </legend>
            <IncomePicker
              incomes={incomes}
              splits={splits}
              onChange={setSplits}
              format={format}
              locale={format.locale}
              entryDate={date}
              expenseToolbar
            />
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {dateField}
            {categoryField}
            <div className="sm:col-span-2">{accountField}</div>
          </div>
        </>
      ) : (
        <div className="record-income-grid">
          <MoneyInput label="Amount" required value={amount} onChange={setAmount} format={format} />
          {categoryField}
          {dateField}
          {accountField}
        </div>
      )}

      <FloatingTextarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
      <button type="submit" disabled={!canSubmit} className="btn-primary w-full h-12">
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Record"}
      </button>
    </form>
  );
}
