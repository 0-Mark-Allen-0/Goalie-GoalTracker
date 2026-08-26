// frontend/src/GoalCard.tsx
// A goal reserves money from specific INCOMES. Reserved money is NOT deducted — it
// still belongs to the earning it came from, it just stops being spendable.
//
// Reaching the target does NOT complete anything: it only enables the Complete button.
// Completing is the single action that turns reservations into a real expense, still
// attributed to the incomes it was spent from.
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  abandonGoal,
  completeGoal,
  deleteGoal,
  releaseFromGoal,
  reopenGoal,
  reserveToGoal,
} from "@/api";
import type { Goal, Income, Label } from "@/api/types";
import { useLedgerMutation } from "@/hooks/queries";
import { incomeColour, incomeTitle, shortDate } from "@/lib/income";
import { formatMoney, parseMoneyInput, percentOf, type MoneyFormat } from "@/lib/money";
import { staggerStyle } from "@/lib/motion";
import { toDraftSplits, toSplits, splitsTotal, type DraftSplit } from "@/lib/splits";
import { cn } from "@/lib/utils";
import { MoneyText, SegmentedBar } from "@/components/data-display";
import { IncomePicker, LabelSelect, MoneyInput } from "@/components/form-controls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoalCardProps {
  goal: Goal;
  incomes: Income[];
  labels: Map<string, Label>;
  format: MoneyFormat;
  index?: number;
  onEdit: (goal: Goal) => void;
}

export function GoalCard({
  goal,
  incomes,
  labels,
  format,
  index = 0,
  onEdit,
}: GoalCardProps) {
  const [reserveOpen, setReserveOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [abandonOpen, setAbandonOpen] = useState(false);

  const incomeById = useMemo(
    () => new Map(incomes.map((income) => [income.id, income])),
    [incomes],
  );

  const remaining = Math.max(0, goal.targetValue - goal.saved);
  const isFunded = goal.saved >= goal.targetValue;
  const isActive = goal.status === "active";
  const progress = percentOf(goal.saved, goal.targetValue);

  // Each segment is one earning standing behind this goal.
  const segments = goal.breakdown.map((split) => {
    const income = incomeById.get(split.incomeId);
    return {
      key: split.incomeId,
      label: income ? incomeTitle(income, format.locale) : "Unknown income",
      amount: split.amount,
      colour: incomeColour(income, labels),
    };
  });

  const deleteMutation = useLedgerMutation(async () => (await deleteGoal(goal.id)).data, {
    successMessage: "Goal deleted.",
    onSuccess: () => setDeleteOpen(false),
  });
  const abandonMutation = useLedgerMutation(
    async () => (await abandonGoal(goal.id)).data,
    {
      successMessage: "Goal abandoned — every reserved rupee is spendable again.",
      onSuccess: () => setAbandonOpen(false),
    },
  );
  const reopenMutation = useLedgerMutation(async () => (await reopenGoal(goal.id)).data, {
    successMessage: "Goal reopened. The expense was removed and the money re-reserved.",
  });

  return (
    <>
      <div
        className={cn(
          "glass-card glass-card-strong glass-card-hover p-5 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-[--motion-slow] fill-mode-both",
          !isActive && "opacity-90",
        )}
        style={staggerStyle(index)}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h3 className="font-serif text-2xl text-ink-1 truncate">{goal.name}</h3>
            {goal.description && (
              <p className="text-sm text-ink-2 font-medium line-clamp-2 mt-0.5">
                {goal.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Manage ${goal.name}`}
                className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink-1 hover:bg-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-hairline bg-white">
              {isActive && (
                <DropdownMenuItem onClick={() => onEdit(goal)} className="gap-2 font-medium">
                  <Pencil className="w-4 h-4" /> Edit
                </DropdownMenuItem>
              )}
              {goal.status === "completed" && (
                <DropdownMenuItem
                  onClick={() => reopenMutation.mutate(undefined as void)}
                  className="gap-2 font-medium"
                >
                  <RotateCcw className="w-4 h-4" /> Reopen
                </DropdownMenuItem>
              )}
              {isActive && (
                <DropdownMenuItem
                  onClick={() => setAbandonOpen(true)}
                  className="gap-2 font-medium"
                >
                  <XCircle className="w-4 h-4" /> Abandon
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 font-medium text-critical"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-baseline gap-2 mt-3 mb-3">
          <MoneyText
            minor={goal.saved}
            format={format}
            className="font-serif text-3xl text-ink-1"
          />
          <span className="text-sm font-semibold text-ink-3 tabular">
            of {formatMoney(goal.targetValue, format)}
          </span>
        </div>

        {/* The signature bar: which earnings are behind this goal. */}
        <SegmentedBar
          segments={segments}
          total={goal.targetValue}
          format={format}
          height={14}
          emptyHint="Nothing reserved yet — put some of an income towards it below."
        />

        <div className="flex items-center justify-between gap-2 mt-4 mb-4">
          {goal.status === "completed" ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-good">
              <CheckCircle2 className="w-4 h-4" /> Completed
            </span>
          ) : goal.status === "abandoned" ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3">
              <XCircle className="w-4 h-4" /> Abandoned
            </span>
          ) : isFunded ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-good">
              <Check className="w-4 h-4" /> Ready to complete
            </span>
          ) : (
            <span className="text-sm font-semibold text-ink-2 tabular">
              {formatMoney(remaining, format)} to go
            </span>
          )}
          <span className="text-sm font-bold text-ink-3 tabular">{Math.round(progress)}%</span>
        </div>

        {isActive && (
          <div className="flex flex-wrap gap-2 mt-auto">
            <button
              onClick={() => setReserveOpen(true)}
              className="btn-primary h-10 px-4 text-sm flex-1"
            >
              <Plus className="w-4 h-4" /> Reserve
            </button>
            <button
              onClick={() => setReleaseOpen(true)}
              disabled={goal.saved === 0}
              className="btn-secondary h-10 px-4 text-sm"
            >
              <Minus className="w-4 h-4" /> Release
            </button>
            <button
              onClick={() => setCompleteOpen(true)}
              disabled={goal.saved === 0}
              className={cn(
                "h-10 px-4 text-sm rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-[--motion-base] border",
                isFunded
                  ? "bg-good text-white border-good shadow-md hover:brightness-105 active:scale-[0.97]"
                  : "bg-white/60 text-ink-2 border-white/70 hover:bg-white active:scale-[0.97]",
                goal.saved === 0 && "opacity-50 cursor-not-allowed",
              )}
            >
              <Target className="w-4 h-4" /> Complete
            </button>
          </div>
        )}
      </div>

      <ReserveDialog
        goal={goal}
        incomes={incomes}
        labels={labels}
        format={format}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        mode="reserve"
      />
      <ReserveDialog
        goal={goal}
        incomes={incomes}
        labels={labels}
        format={format}
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        mode="release"
      />
      <CompleteGoalDialog
        goal={goal}
        incomes={incomes}
        format={format}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
      />

      <AlertDialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <AlertDialogContent className="rounded-[32px] bg-canvas border-hairline">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-ink-1">
              Abandon {goal.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-2 font-medium">
              Every reserved rupee goes straight back to the income it came from. No
              expense is recorded, because nothing was actually spent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                abandonMutation.mutate(undefined as void);
              }}
              className="btn-primary"
            >
              Abandon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[32px] bg-canvas border-hairline">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-ink-1">
              Delete {goal.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-2 font-medium">
              Reservations are released back to their incomes. If this goal was already
              completed, the expense it created is kept — that money really was spent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate(undefined as void);
              }}
              className="btn-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Reserve / release -------------------------------------------------------

function ReserveDialog({
  goal,
  incomes,
  labels,
  format,
  open,
  onOpenChange,
  mode,
}: {
  goal: Goal;
  incomes: Income[];
  labels: Map<string, Label>;
  format: MoneyFormat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "reserve" | "release";
}) {
  const isReserve = mode === "reserve";
  const held = useMemo(
    () => new Map(goal.breakdown.map((split) => [split.incomeId, split.amount])),
    [goal.breakdown],
  );

  const options = useMemo(
    () =>
      isReserve
        ? incomes.filter((income) => income.remaining > 0)
        : incomes.filter((income) => (held.get(income.id) ?? 0) > 0),
    [incomes, isReserve, held],
  );

  const [incomeId, setIncomeId] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setIncomeId(options[0]?.id ?? "");
    setText("");
    // Options are derived from props; re-seeding on open is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const amount = parseMoneyInput(text, format) ?? 0;
  const gap = Math.max(0, goal.targetValue - goal.saved);
  const income = incomes.find((candidate) => candidate.id === incomeId);

  const ceiling = isReserve
    ? Math.min(income?.remaining ?? 0, gap)
    : (held.get(incomeId) ?? 0);

  const mutation = useLedgerMutation(
    async () => {
      const call = isReserve ? reserveToGoal : releaseFromGoal;
      return (await call(goal.id, { incomeId, amount })).data;
    },
    {
      successMessage: isReserve
        ? "Reserved. The money stays with its income — it is just spoken for now."
        : "Released back to its income.",
      onSuccess: () => onOpenChange(false),
    },
  );

  const canSubmit = Boolean(incomeId) && amount > 0 && amount <= ceiling && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto no-scrollbar rounded-[32px] bg-canvas border-hairline p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-ink-1">
            {isReserve ? "Reserve for" : "Release from"} {goal.name}
          </DialogTitle>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-ink-2 font-medium py-4">
            {isReserve
              ? "No income has anything left to reserve. Record some income first."
              : "Nothing is reserved for this goal yet."}
          </p>
        ) : (
          <form
            className="space-y-4 pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) mutation.mutate(undefined as void);
            }}
          >
            <div className="space-y-2">
              <FieldLabel className="text-sm font-semibold text-ink-2">
                {isReserve ? "Which income?" : "Release from which income?"}
              </FieldLabel>
              <Select value={incomeId} onValueChange={setIncomeId}>
                <SelectTrigger className="field w-full">
                  <SelectValue placeholder="Choose an income" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-hairline bg-white max-h-72">
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: incomeColour(option, labels) }}
                        />
                        <span className="truncate">{option.description}</span>
                        <span className="text-ink-3 text-xs tabular shrink-0">
                          {shortDate(option.date, format.locale)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs font-medium text-ink-3 tabular">
                {isReserve
                  ? `${formatMoney(income?.remaining ?? 0, format)} unspent · ${formatMoney(gap, format)} still needed`
                  : `${formatMoney(held.get(incomeId) ?? 0, format)} of this income is reserved here`}
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel className="text-sm font-semibold text-ink-2">Amount</FieldLabel>
              <MoneyInput
                autoFocus
                value={text}
                onChange={setText}
                format={format}
                max={ceiling}
                maxLabel={`The most you can ${mode} here is ${formatMoney(ceiling, format)}.`}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full h-11">
              {mutation.isPending ? "Working…" : isReserve ? "Reserve" : "Release"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Completion --------------------------------------------------------------

function CompleteGoalDialog({
  goal,
  incomes,
  format,
  open,
  onOpenChange,
}: {
  goal: Goal;
  incomes: Income[];
  format: MoneyFormat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [splits, setSplits] = useState<DraftSplit[]>([]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSplits(toDraftSplits(goal.breakdown));
    setDescription(goal.name);
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryId(null);
    setAccountId(null);
  }, [open, goal]);

  // Completing releases the reservations first, so each income's ceiling is its
  // unspent balance plus whatever this goal was holding from it.
  const extraAllowance = useMemo(
    () => Object.fromEntries(goal.breakdown.map((split) => [split.incomeId, split.amount])),
    [goal.breakdown],
  );

  const prepared = toSplits(splits, format);
  const actualAmount = splitsTotal(prepared);
  const difference = actualAmount - goal.saved;

  const mutation = useLedgerMutation(
    async () =>
      (
        await completeGoal(goal.id, {
          actualAmount,
          date: `${date}T00:00:00Z`,
          description: description.trim() || goal.name,
          categoryId,
          accountId,
          splits: prepared,
        })
      ).data,
    {
      successMessage: "Done. The money left each income and is now a real expense.",
      onSuccess: () => onOpenChange(false),
    },
  );

  const canSubmit = prepared.length > 0 && actualAmount > 0 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto no-scrollbar rounded-[32px] bg-canvas border-hairline p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-ink-1">
            Complete {goal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <p className="text-sm font-medium text-ink-2">
            This records what you actually spent. Each income below is drawn down for
            real, and the purchase joins your expense history.
          </p>

          <div className="space-y-2">
            <FieldLabel className="text-sm font-semibold text-ink-2">
              Spent from
            </FieldLabel>
            <IncomePicker
              incomes={incomes}
              splits={splits}
              onChange={setSplits}
              format={format}
              locale={format.locale}
              extraAllowance={extraAllowance}
              entryDate={date}
            />
          </div>

          <div className="rounded-2xl bg-white/70 border border-white/80 p-4 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink-2">Total spend</span>
              <MoneyText
                minor={actualAmount}
                format={format}
                className="font-serif text-2xl text-ink-1"
              />
            </div>
            {difference !== 0 && (
              <p className="text-xs font-semibold text-ink-3 tabular">
                {difference < 0
                  ? `${formatMoney(-difference, format)} of your reservation goes back to its income.`
                  : `${formatMoney(difference, format)} more than you reserved — it comes out of unspent money.`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <FieldLabel className="text-sm font-semibold text-ink-2">Description</FieldLabel>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="field"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel className="text-sm font-semibold text-ink-2">Date</FieldLabel>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="field"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel className="text-sm font-semibold text-ink-2">Category</FieldLabel>
              <LabelSelect
                kind="expense_category"
                value={categoryId}
                onChange={setCategoryId}
                placeholder="No category"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel className="text-sm font-semibold text-ink-2">
                Account <span className="font-normal text-ink-3">(optional)</span>
              </FieldLabel>
              <LabelSelect
                kind="account"
                value={accountId}
                onChange={setAccountId}
                placeholder="No account"
              />
            </div>
          </div>

          <button
            onClick={() => canSubmit && mutation.mutate(undefined as void)}
            disabled={!canSubmit}
            className="btn-primary w-full h-12"
          >
            {mutation.isPending ? "Completing…" : "Complete goal"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
