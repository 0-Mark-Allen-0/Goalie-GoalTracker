// frontend/src/IncomeCard.tsx
// One earning event — a lot. It has its own date and its own balance, and expenses
// are spent from it by name: "the ₹10,000 Mr. John paid me on 14 August".
import { useState, type CSSProperties } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { deleteEntry } from "@/api";
import type { Income, Label } from "@/api/types";
import { useLedgerMutation } from "@/hooks/queries";
import { incomeColour, longDate } from "@/lib/income";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import { SOURCE_COLOURS, SPENT_COLOUR } from "@/lib/palette";
import { staggerStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MoneyText, SegmentedBar } from "@/components/data-display";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IncomeCardProps {
  income: Income;
  labels: Map<string, Label>;
  format: MoneyFormat;
  index?: number;
  categoryTint?: boolean;
  onEdit: (income: Income) => void;
}

export function IncomeCard({ income, labels, format, index = 0, categoryTint = false, onEdit }: IncomeCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const colour = incomeColour(income, labels);
  const category = income.categoryId ? labels.get(income.categoryId) : undefined;
  const account = income.accountId ? labels.get(income.accountId) : undefined;
  const committed = income.spent + income.reserved;
  const showCategoryColour = categoryTint && category?.kind === "income_category"
    && SOURCE_COLOURS.some((slot) => slot.slot === category.colourSlot);

  const deleteMutation = useLedgerMutation(
    async () => (await deleteEntry(income.id)).data,
    { successMessage: "Income deleted.", onSuccess: () => setDeleteOpen(false) },
  );

  return (
    <>
      <div
        className={cn(
          "glass-card glass-card-strong glass-card-hover content-card min-w-0 p-5 animate-in fade-in slide-in-from-bottom-4 duration-(--motion-slow) fill-mode-both",
          categoryTint && "transaction-glass",
        )}
        data-tone={categoryTint ? "category" : undefined}
        style={{
          ...staggerStyle(index),
          ...(showCategoryColour ? ({ "--transaction-accent": colour } as CSSProperties) : {}),
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: colour }}
              />
              <h3 className="card-heading font-serif text-ink-1 min-w-0 wrap-anywhere md:truncate">
                {income.description}
              </h3>
            </div>
            {/* The date is not decoration — it is half of this lot's identity. */}
            <p className="text-xs md:text-sm font-semibold text-ink-2 mt-1 tabular wrap-anywhere">
              {longDate(income.date, format.locale)}
              {category && <span className="text-ink-3"> · {category.name}</span>}
              {account && <span className="text-ink-3"> · into {account.name}</span>}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Manage ${income.description}`}
                className="shrink-0 size-11 md:size-8 rounded-full grid place-items-center text-ink-3 hover:text-ink-1 hover:bg-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-hairline bg-white">
              <DropdownMenuItem onClick={() => onEdit(income)} className="gap-2 font-medium">
                <Pencil className="w-4 h-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 font-medium text-critical"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex max-md:flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-4">
          <MoneyText
            minor={income.remaining}
            format={format}
            className="amount-heading font-serif text-ink-1"
          />
          <span className="text-sm font-semibold text-ink-3 tabular wrap-anywhere">
            left of {formatMoney(income.total, format)}
          </span>
        </div>

        {/* Spent recedes into the neutral; reserved is hatched because it is still
            here, just claimed; the solid block is what you can still spend. */}
        <SegmentedBar
          total={income.total}
          format={format}
          segments={[
            { key: "spent", label: "Spent", amount: income.spent, colour: SPENT_COLOUR },
            {
              key: "reserved",
              label: "Reserved",
              amount: income.reserved,
              colour,
              hatched: true,
            },
            { key: "remaining", label: "Unspent", amount: income.remaining, colour },
          ]}
          emptyHint="None of this has been spent yet."
        />

        {income.note && (
          <p className="text-xs font-medium text-ink-3 mt-3 line-clamp-2">{income.note}</p>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-[32px] bg-canvas border-hairline">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-ink-1">
              Delete this income?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-2 font-medium">
              {committed > 0
                ? `${formatMoney(committed, format)} has already been spent or reserved from this income, so it cannot be deleted until those entries are removed.`
                : `${income.description} · ${formatMoney(income.total, format)}. Nothing has been spent from it, so it can go cleanly.`}
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
