// frontend/src/EntriesPage.tsx
// Powers three routes:
//   /income   — the lots themselves, each showing how much of it is left
//   /expenses — draws, each showing which earning it was SPENT FROM
//   /ledger   — everything, reservations included
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Lock,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Unlock,
  Wallet,
} from "lucide-react";

import { deleteEntry, exportCsvUrl } from "@/api";
import type { Entry, EntryKind, Income, Label } from "@/api/types";
import {
  useEntries,
  useIncomes,
  useLabels,
  useLedgerMutation,
  useMoneyFormat,
  usePnl,
} from "@/hooks/queries";
import { incomeColour, incomeTitle, labelsById } from "@/lib/income";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import { staggerStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AppShell, LoadingScreen, PageHeader } from "@/components/AppShell";
import { EmptyState, MoneyText, SourceChip } from "@/components/data-display";
import { EntryForm } from "@/EntryForm";
import { IncomeCard } from "@/IncomeCard";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const KIND_META: Record<EntryKind, { icon: typeof ArrowDownLeft; tone: string }> = {
  income: { icon: ArrowDownLeft, tone: "text-good" },
  expense: { icon: ArrowUpRight, tone: "text-ink-1" },
  reservation: { icon: Lock, tone: "text-ink-3" },
  release: { icon: Unlock, tone: "text-ink-3" },
};

function monthLabel(key: string, locale?: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthRange(key: string): { from: string; to: string } {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from: start.toISOString(), to: end.toISOString() };
}

function EntryRow({
  entry,
  incomes,
  labels,
  format,
  index,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  incomes: Map<string, Income>;
  labels: Map<string, Label>;
  format: MoneyFormat;
  index: number;
  onEdit?: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
}) {
  const meta = KIND_META[entry.kind];
  const Icon = meta.icon;
  const editable = entry.kind === "income" || entry.kind === "expense";
  const category = entry.categoryId ? labels.get(entry.categoryId) : undefined;
  const account = entry.accountId ? labels.get(entry.accountId) : undefined;

  return (
    <div
      className="glass-card glass-card-strong p-4 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-[--motion-base] fill-mode-both"
      style={staggerStyle(index)}
    >
      <span
        className={cn(
          "shrink-0 w-9 h-9 rounded-full grid place-items-center bg-white/80",
          meta.tone,
        )}
      >
        <Icon className="w-4 h-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-1 truncate">{entry.description}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* This line is the whole point of the app: whose money paid for it. */}
          {entry.splits.length > 0 && (
            <span className="text-xs font-medium text-ink-3">Spent from</span>
          )}
          {entry.splits.map((split) => {
            const income = incomes.get(split.incomeId);
            return (
              <SourceChip
                key={split.incomeId}
                name={
                  entry.splits.length > 1
                    ? `${incomeTitle(income, format.locale)} · ${formatMoney(split.amount, format)}`
                    : incomeTitle(income, format.locale)
                }
                colour={incomeColour(income, labels)}
              />
            );
          })}
          {category && (
            <span className="text-xs font-semibold text-ink-3 bg-white/60 rounded-full px-2.5 py-0.5">
              {category.name}
            </span>
          )}
          {account && <span className="text-xs font-medium text-ink-3">via {account.name}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="text-right">
          <MoneyText
            minor={entry.total}
            format={format}
            className={cn("font-semibold text-lg", entry.kind === "income" && "text-good")}
          />
          <p className="text-xs font-medium text-ink-3">
            {new Date(entry.date).toLocaleDateString(format.locale, {
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })}
          </p>
        </div>

        {editable && onEdit && onDelete && (
          <div className="flex gap-1">
            <button
              aria-label="Edit entry"
              onClick={() => onEdit(entry)}
              className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink-1 hover:bg-white transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              aria-label="Delete entry"
              onClick={() => onDelete(entry)}
              className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-critical hover:bg-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Expense totals per category for one month. */
function CategoryBreakdown({
  labels,
  format,
}: {
  labels: Map<string, Label>;
  format: MoneyFormat;
}) {
  const { data: allTime } = usePnl({ groupBy: "month" });
  const months = allTime?.periods ?? [];
  const [month, setMonth] = useState<string>("");
  const active = month || months[months.length - 1]?.period || "";

  const { data: monthly } = usePnl(active ? monthRange(active) : {});

  const rows = useMemo(() => {
    const source = active ? (monthly?.expenseByCategory ?? []) : [];
    const total = source.reduce((sum, row) => sum + row.total, 0);
    return source.map((row) => ({
      name: row.categoryId ? (labels.get(row.categoryId)?.name ?? "Uncategorised") : "Uncategorised",
      total: row.total,
      share: total > 0 ? (row.total / total) * 100 : 0,
    }));
  }, [monthly, active, labels]);

  if (months.length === 0) return null;

  return (
    <div className="glass-card glass-card-strong p-5 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-serif text-2xl text-ink-1">Where it went</h2>
        <Select value={active} onValueChange={setMonth}>
          <SelectTrigger className="field w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-hairline bg-white">
            {[...months].reverse().map((entry) => (
              <SelectItem key={entry.period} value={entry.period}>
                {monthLabel(entry.period, format.locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm font-medium text-ink-3">No expenses recorded this month.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink-2 w-32 shrink-0 truncate">
                {row.name}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-surface-sunk overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{
                    width: `${row.share}%`,
                    transition: "width var(--motion-slow) var(--ease-out)",
                  }}
                />
              </div>
              <MoneyText
                minor={row.total}
                format={format}
                className="text-sm font-semibold text-ink-1 w-28 text-right"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EntriesPageProps {
  kind?: "income" | "expense";
}

export function EntriesPage({ kind }: EntriesPageProps) {
  const format = useMoneyFormat();
  const { data: allLabels = [] } = useLabels();
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();

  const [search, setSearch] = useState("");
  const [incomeId, setIncomeId] = useState(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [accountId, setAccountId] = useState(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const isIncomePage = kind === "income";
  const isLedger = kind === undefined;

  const filters = useMemo(
    () => ({
      kind,
      search: search.trim() || undefined,
      incomeId: incomeId === ALL ? undefined : incomeId,
      categoryId: categoryId === ALL ? undefined : categoryId,
      accountId: accountId === ALL ? undefined : accountId,
      limit: 300,
    }),
    [kind, search, incomeId, categoryId, accountId],
  );

  // The income page renders lots (which carry a drawdown); the others render entries.
  const { data: entries = [], isLoading: entriesLoading } = useEntries(
    isIncomePage ? { kind: "income", limit: 1 } : filters,
  );

  const labelMap = useMemo(() => labelsById(allLabels), [allLabels]);
  const incomeMap = useMemo(
    () => new Map(incomes.map((income) => [income.id, income])),
    [incomes],
  );

  const categories = allLabels.filter((label) =>
    isIncomePage ? label.kind === "income_category" : label.kind === "expense_category",
  );
  const accounts = allLabels.filter((label) => label.kind === "account");

  const visibleIncomes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incomes.filter((income) => {
      if (term && !income.description.toLowerCase().includes(term)) return false;
      if (categoryId !== ALL && income.categoryId !== categoryId) return false;
      if (accountId !== ALL && income.accountId !== accountId) return false;
      return true;
    });
  }, [incomes, search, categoryId, accountId]);

  const deleteMutation = useLedgerMutation(
    async (entry: Entry) => (await deleteEntry(entry.id)).data,
    { successMessage: "Entry deleted.", onSuccess: () => setPendingDelete(null) },
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    entries.forEach((entry) => {
      const key = entry.date.slice(0, 7);
      const bucket = groups.get(key);
      if (bucket) bucket.push(entry);
      else groups.set(key, [entry]);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const title = isIncomePage ? "Income" : kind === "expense" ? "Expenses" : "Ledger";
  const subtitle = isIncomePage
    ? "Each earning, when it came in, and how much of it is left."
    : kind === "expense"
      ? "Everything that went out, and exactly which earning paid for it."
      : "Every movement, including money reserved for and released from goals.";

  const isLoading = incomesLoading || (!isIncomePage && entriesLoading);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <AppShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={exportCsvUrl({
                kind,
                incomeId: filters.incomeId,
                categoryId: filters.categoryId,
                accountId: filters.accountId,
                search: filters.search,
              })}
              className="btn-secondary h-11 px-5 text-sm"
            >
              <Download className="w-4 h-4" /> Export CSV
            </a>
            {!isLedger && (
              <button
                onClick={openNew}
                disabled={kind === "expense" && incomes.length === 0}
                className="btn-primary h-11 px-5 text-sm"
              >
                <Plus className="w-4 h-4" /> Add {kind}
              </button>
            )}
          </div>
        }
      />

      {kind === "expense" && <CategoryBreakdown labels={labelMap} format={format} />}

      <div className="glass-card glass-card-strong p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search descriptions…"
            className="field pl-10 w-full"
          />
        </div>

        {!isIncomePage && incomes.length > 0 && (
          <Select value={incomeId} onValueChange={setIncomeId}>
            <SelectTrigger className="field w-56">
              <SelectValue placeholder="Any income" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-hairline bg-white max-h-72">
              <SelectItem value={ALL}>Any income</SelectItem>
              {incomes.map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {incomeTitle(income, format.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {categories.length > 0 && (
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="field w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-hairline bg-white">
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {accounts.length > 0 && (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="field w-44">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-hairline bg-white">
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : isIncomePage ? (
        visibleIncomes.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-16 h-16" />}
            title="No income recorded yet"
            description="Record what you earned, what it was for and when. Everything you spend afterwards points back at one of these."
            action={
              <button onClick={openNew} className="btn-primary h-12 px-8">
                <Plus className="w-4 h-4" /> Add income
              </button>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleIncomes.map((income, index) => (
              <IncomeCard
                key={income.id}
                income={income}
                labels={labelMap}
                format={format}
                index={index}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
              />
            ))}
          </div>
        )
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-16 h-16" />}
          title={incomes.length === 0 ? "No income yet" : "Nothing here yet"}
          description={
            incomes.length === 0
              ? "Record an income first — every expense has to be spent from one."
              : isLedger
                ? "Once you record income or an expense, it shows up here."
                : "Record your first expense and it will appear here, tagged with the earning it came from."
          }
          action={
            !isLedger && incomes.length > 0 ? (
              <button onClick={openNew} className="btn-primary h-12 px-8">
                <Plus className="w-4 h-4" /> Add {kind}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, monthEntries]) => (
            <section key={month}>
              <h2 className="font-serif text-2xl text-ink-1 mb-3">
                {monthLabel(month, format.locale)}
              </h2>
              <div className="space-y-2.5">
                {monthEntries.map((entry, index) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    incomes={incomeMap}
                    labels={labelMap}
                    format={format}
                    index={index}
                    onEdit={(target) => {
                      setEditing(target);
                      setFormOpen(true);
                    }}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EntryForm
        kind={editing ? (editing.kind as "income" | "expense") : (kind ?? "expense")}
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditing(null);
        }}
        incomes={incomes}
        format={format}
        entry={editing}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <AlertDialogContent className="rounded-[32px] bg-canvas border-hairline">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-ink-1">
              Delete this entry?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-2 font-medium">
              {pendingDelete?.description} ·{" "}
              {pendingDelete ? formatMoney(pendingDelete.total, format) : ""}. An income
              can only be deleted while nothing has been spent from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete) deleteMutation.mutate(pendingDelete);
              }}
              className="btn-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
