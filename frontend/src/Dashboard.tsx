// frontend/src/Dashboard.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Plus,
  Target,
  Wallet,
} from "lucide-react";

import type { Entry, Income } from "@/api/types";
import {
  useGoals,
  useIncomes,
  useLabels,
  useMoneyFormat,
  usePnl,
} from "@/hooks/queries";
import { labelsById } from "@/lib/income";
import { AppShell, LoadingScreen, PageHeader } from "@/components/AppShell";
import { EmptyState, StatTile } from "@/components/data-display";
import { IncomeCard } from "@/IncomeCard";
import { GoalCard } from "@/GoalCard";
import { GoalForm } from "@/GoalForm";
import { EntryForm } from "@/EntryForm";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const format = useMoneyFormat();

  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: allLabels = [] } = useLabels();
  const { data: pnl } = usePnl({ groupBy: "month" });

  const [goalOpen, setGoalOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const labelMap = useMemo(() => labelsById(allLabels), [allLabels]);

  const totals = useMemo(() => {
    const month = pnl?.periods.find((entry) => entry.period === currentMonthKey());
    return {
      unspent: incomes.reduce((sum, income) => sum + income.remaining, 0),
      reserved: incomes.reduce((sum, income) => sum + income.reserved, 0),
      monthIncome: month?.income ?? 0,
      monthExpense: month?.expense ?? 0,
    };
  }, [incomes, pnl]);

  // The lots you can still spend from, most recent first — that is the working set.
  const openLots = incomes.filter((income) => income.remaining > 0).slice(0, 6);
  const activeGoals = goals.filter((goal) => goal.status === "active");

  const openEdit = (income: Income) => {
    setEditingEntry(income);
    setIncomeOpen(true);
  };

  if (incomesLoading || goalsLoading) {
    return (
      <AppShell>
        <LoadingScreen />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Your money"
        subtitle="Every rupee still attached to the work that earned it."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setEditingEntry(null);
                setIncomeOpen(true);
              }}
              className="btn-secondary h-11 px-5 text-sm"
            >
              <ArrowDownLeft className="w-4 h-4" /> Income
            </button>
            <button
              onClick={() => {
                setEditingEntry(null);
                setExpenseOpen(true);
              }}
              disabled={incomes.length === 0}
              className="btn-primary h-11 px-5 text-sm"
            >
              <ArrowUpRight className="w-4 h-4" /> Expense
            </button>
          </div>
        }
      />

      {incomes.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-16 h-16" />}
          title="Start with something you earned"
          description="Record an income — what it was for, how much, and when. Every expense you log afterwards points back at one of these, so you always know whose money you spent."
          action={
            <button
              onClick={() => {
                setEditingEntry(null);
                setIncomeOpen(true);
              }}
              className="btn-primary h-12 px-8"
            >
              <Plus className="w-4 h-4" /> Record your first income
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatTile
              label="Unspent"
              minor={totals.unspent}
              format={format}
              hint="Across every income"
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatTile
              label="Reserved"
              minor={totals.reserved}
              format={format}
              hint="Claimed by goals, not spent"
              icon={<Lock className="w-4 h-4" />}
            />
            <StatTile
              label="Earned this month"
              minor={totals.monthIncome}
              format={format}
              icon={<ArrowDownLeft className="w-4 h-4" />}
            />
            <StatTile
              label="Spent this month"
              minor={totals.monthExpense}
              format={format}
              icon={<ArrowUpRight className="w-4 h-4" />}
            />
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-serif text-3xl text-ink-1">Money still unspent</h2>
              <button
                onClick={() => navigate("/income")}
                className="btn-secondary h-10 px-4 text-sm"
              >
                All income
              </button>
            </div>

            {openLots.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-16 h-16" />}
                title="Every rupee is accounted for"
                description="Nothing you have earned is left unspent or unreserved. Record more income to keep going."
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {openLots.map((income, index) => (
                  <IncomeCard
                    key={income.id}
                    income={income}
                    labels={labelMap}
                    format={format}
                    index={index}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-serif text-3xl text-ink-1">Goals</h2>
              <div className="flex gap-2">
                {activeGoals.length > 0 && (
                  <button
                    onClick={() => navigate("/goals")}
                    className="btn-secondary h-10 px-4 text-sm"
                  >
                    View all
                  </button>
                )}
                <button onClick={() => setGoalOpen(true)} className="btn-secondary h-10 px-4 text-sm">
                  <Plus className="w-4 h-4" /> New goal
                </button>
              </div>
            </div>

            {activeGoals.length === 0 ? (
              <EmptyState
                icon={<Target className="w-16 h-16" />}
                title="No goals yet"
                description="Set a target, then reserve money towards it from whichever earnings you like. Reserved money stays put — it just stops being spendable."
                action={
                  <button onClick={() => setGoalOpen(true)} className="btn-primary h-12 px-8">
                    <Plus className="w-4 h-4" /> Create a goal
                  </button>
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeGoals.slice(0, 3).map((goal, index) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    incomes={incomes}
                    labels={labelMap}
                    format={format}
                    index={index}
                    onEdit={() => navigate("/goals")}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <GoalForm open={goalOpen} onOpenChange={setGoalOpen} format={format} />
      <EntryForm
        kind="income"
        open={incomeOpen}
        onOpenChange={(next) => {
          setIncomeOpen(next);
          if (!next) setEditingEntry(null);
        }}
        incomes={incomes}
        format={format}
        entry={editingEntry}
      />
      <EntryForm
        kind="expense"
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        incomes={incomes}
        format={format}
      />
    </AppShell>
  );
}
