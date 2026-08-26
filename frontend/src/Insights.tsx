// frontend/src/Insights.tsx
// The P&L lives here, alongside the two views it cannot give you: how far each income
// has been drawn down, and which earnings are standing behind each goal.
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Target } from "lucide-react";

import type { Label } from "@/api/types";
import { useGoals, useIncomes, useLabels, useMoneyFormat, usePnl } from "@/hooks/queries";
import { incomeColour, incomeTitle, labelsById } from "@/lib/income";
import { formatMoney, formatMoneyCompact, type MoneyFormat } from "@/lib/money";
import { SOURCE_COLOURS, SPENT_COLOUR } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { AppShell, LoadingScreen, PageHeader } from "@/components/AppShell";
import { EmptyState, MoneyText, SegmentedBar, StatTile } from "@/components/data-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Categorical slots 1 and 2, in fixed palette order — never re-picked per chart.
const INCOME_COLOUR = SOURCE_COLOURS[0].hex;
const EXPENSE_COLOUR = SOURCE_COLOURS[1].hex;

type Range = "6m" | "12m" | "ytd" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "This year" },
  { value: "all", label: "All time" },
];

function rangeParams(range: Range): { from?: string; groupBy: "month" | "year" } {
  const now = new Date();
  switch (range) {
    case "6m": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
      return { from: from.toISOString(), groupBy: "month" };
    }
    case "12m": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      return { from: from.toISOString(), groupBy: "month" };
    }
    case "ytd": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { from: from.toISOString(), groupBy: "month" };
    }
    default:
      return { groupBy: "year" };
  }
}

function periodLabel(period: string, locale?: string): string {
  if (!period.includes("-")) return period;
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
  });
}

function MoneyTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  format: MoneyFormat;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-white border border-hairline shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-ink-3 mb-1">{label}</p>
      {payload.map((item) => (
        <p
          key={item.name}
          className="text-sm font-semibold text-ink-1 tabular flex items-center gap-2"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          {item.name}: {formatMoney(item.value ?? 0, format)}
        </p>
      ))}
    </div>
  );
}

function CategoryList({
  title,
  rows,
  labels,
  format,
  colour,
}: {
  title: string;
  rows: { categoryId: string | null; total: number }[];
  labels: Map<string, Label>;
  format: MoneyFormat;
  colour: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm font-medium text-ink-3">Nothing in this period.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const name = row.categoryId
              ? (labels.get(row.categoryId)?.name ?? "Uncategorised")
              : "Uncategorised";
            const share = total > 0 ? (row.total / total) * 100 : 0;
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink-2 w-28 shrink-0 truncate">
                  {name}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-surface-sunk overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${share}%`,
                      backgroundColor: colour,
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Insights() {
  const format = useMoneyFormat();
  const [range, setRange] = useState<Range>("6m");

  const { data: incomes = [], isLoading } = useIncomes();
  const { data: goals = [] } = useGoals();
  const { data: allLabels = [] } = useLabels();
  const { data: pnl } = usePnl(rangeParams(range));

  const labelMap = useMemo(() => labelsById(allLabels), [allLabels]);
  const incomeById = useMemo(
    () => new Map(incomes.map((income) => [income.id, income])),
    [incomes],
  );

  const chartData = useMemo(
    () =>
      (pnl?.periods ?? []).map((entry) => ({
        period: periodLabel(entry.period, format.locale),
        Income: entry.income,
        Expense: entry.expense,
      })),
    [pnl, format.locale],
  );

  const activeGoals = goals.filter((goal) => goal.status === "active");
  const drawnLots = incomes.filter((income) => income.total > 0).slice(0, 12);

  if (isLoading) {
    return (
      <AppShell>
        <LoadingScreen />
      </AppShell>
    );
  }

  if (incomes.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Insights" />
        <EmptyState
          icon={<BarChart3 className="w-16 h-16" />}
          title="Nothing to report yet"
          description="Record an income and a few expenses — your profit and loss will build itself from there."
        />
      </AppShell>
    );
  }

  const totals = pnl?.totals ?? { income: 0, expense: 0, net: 0 };

  return (
    <AppShell>
      <PageHeader
        title="Insights"
        subtitle="Profit and loss, plus what is left of each earning."
        action={
          <Select value={range} onValueChange={(next) => setRange(next as Range)}>
            <SelectTrigger className="field w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-hairline bg-white">
              {RANGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* --- Profit and loss --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Earned" minor={totals.income} format={format} />
        <StatTile label="Spent" minor={totals.expense} format={format} />
        <StatTile
          label="Net"
          minor={totals.net}
          format={format}
          hint={totals.net >= 0 ? "Kept" : "Overspent"}
          accent={totals.net >= 0 ? "var(--good)" : "var(--critical)"}
        />
      </div>

      {chartData.length > 0 && (
        <section className="glass-card glass-card-strong p-6 mb-8">
          <h2 className="font-serif text-2xl text-ink-1 mb-1">Profit &amp; loss</h2>
          <p className="text-sm font-medium text-ink-2 mb-5">
            This is a period view: money earned in August and spent in September counts
            as August income and September expense. To see how far a single earning has
            been drawn down, look below.
          </p>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfdad1" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#57534b", fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => formatMoneyCompact(value, format)}
                  tick={{ fill: "#8a857b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  cursor={{ fill: "rgba(20,80,74,0.06)" }}
                  content={<MoneyTooltip format={format} />}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "#57534b" }}
                  iconType="circle"
                />
                <Bar dataKey="Income" fill={INCOME_COLOUR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill={EXPENSE_COLOUR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-hairline">
            <CategoryList
              title="Earned by category"
              rows={pnl?.incomeByCategory ?? []}
              labels={labelMap}
              format={format}
              colour={INCOME_COLOUR}
            />
            <CategoryList
              title="Spent by category"
              rows={pnl?.expenseByCategory ?? []}
              labels={labelMap}
              format={format}
              colour={EXPENSE_COLOUR}
            />
          </div>

          {(pnl?.periods.length ?? 0) > 0 && (
            <div className="mt-8 pt-6 border-t border-hairline overflow-x-auto">
              <table className="w-full text-sm min-w-[24rem]">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-3">
                    <th className="pb-2 font-semibold">Period</th>
                    <th className="pb-2 font-semibold text-right">Earned</th>
                    <th className="pb-2 font-semibold text-right">Spent</th>
                    <th className="pb-2 font-semibold text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(pnl?.periods ?? [])].reverse().map((row) => (
                    <tr key={row.period} className="border-t border-hairline">
                      <td className="py-2 font-semibold text-ink-1">{row.period}</td>
                      <td className="py-2 text-right tabular text-ink-2">
                        {formatMoney(row.income, format)}
                      </td>
                      <td className="py-2 text-right tabular text-ink-2">
                        {formatMoney(row.expense, format)}
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right tabular font-semibold",
                          row.net >= 0 ? "text-good" : "text-critical",
                        )}
                      >
                        {formatMoney(row.net, format)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* --- Lot drawdown --- */}
      <section className="glass-card glass-card-strong p-6 mb-8">
        <h2 className="font-serif text-2xl text-ink-1 mb-1">What is left of each earning</h2>
        <p className="text-sm font-medium text-ink-2 mb-5">
          Spent sits in neutral, reserved is hatched because it is still here, and the
          solid block is what you can still spend.
        </p>
        <div className="space-y-5">
          {drawnLots.map((income) => (
            <div key={income.id}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="font-semibold text-ink-1 truncate">
                  {incomeTitle(income, format.locale)}
                </span>
                <span className="text-sm font-semibold text-ink-3 tabular shrink-0">
                  {formatMoney(income.total, format)} earned
                </span>
              </div>
              <SegmentedBar
                total={income.total}
                format={format}
                segments={[
                  { key: "spent", label: "Spent", amount: income.spent, colour: SPENT_COLOUR },
                  {
                    key: "reserved",
                    label: "Reserved",
                    amount: income.reserved,
                    colour: incomeColour(income, labelMap),
                    hatched: true,
                  },
                  {
                    key: "remaining",
                    label: "Unspent",
                    amount: income.remaining,
                    colour: incomeColour(income, labelMap),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      </section>

      {/* --- Goal funding --- */}
      <section className="glass-card glass-card-strong p-6">
        <h2 className="font-serif text-2xl text-ink-1 mb-1">Goal funding</h2>
        <p className="text-sm font-medium text-ink-2 mb-5">
          Which earnings are standing behind each goal.
        </p>

        {activeGoals.length === 0 ? (
          <div className="flex items-center gap-3 text-ink-3">
            <Target className="w-5 h-5" />
            <p className="text-sm font-medium">No active goals right now.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {activeGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="font-semibold text-ink-1">{goal.name}</span>
                  <span className="text-sm font-semibold text-ink-3 tabular">
                    {formatMoney(goal.saved, format)} of{" "}
                    {formatMoney(goal.targetValue, format)}
                  </span>
                </div>
                <SegmentedBar
                  total={goal.targetValue}
                  format={format}
                  segments={goal.breakdown.map((split) => ({
                    key: split.incomeId,
                    label: incomeTitle(incomeById.get(split.incomeId), format.locale),
                    amount: split.amount,
                    colour: incomeColour(incomeById.get(split.incomeId), labelMap),
                  }))}
                  emptyHint="Nothing reserved for this goal yet."
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
