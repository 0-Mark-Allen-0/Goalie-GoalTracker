// frontend/src/GoalsPage.tsx
import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";

import type { Goal, GoalStatus } from "@/api/types";
import { useGoals, useIncomes, useLabels, useMoneyFormat } from "@/hooks/queries";
import { labelsById } from "@/lib/income";
import { cn } from "@/lib/utils";
import { AppShell, LoadingScreen, PageHeader } from "@/components/AppShell";
import { EmptyState } from "@/components/data-display";
import { GoalCard } from "@/GoalCard";
import { GoalForm } from "@/GoalForm";

const TABS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
];

export function GoalsPage() {
  const format = useMoneyFormat();
  const { data: goals = [], isLoading } = useGoals();
  const { data: incomes = [] } = useIncomes();
  const { data: allLabels = [] } = useLabels();
  const labelMap = useMemo(() => labelsById(allLabels), [allLabels]);

  const [tab, setTab] = useState<GoalStatus>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const visible = goals.filter((goal) => goal.status === tab);
  const counts = {
    active: goals.filter((goal) => goal.status === "active").length,
    completed: goals.filter((goal) => goal.status === "completed").length,
    abandoned: goals.filter((goal) => goal.status === "abandoned").length,
  };

  if (isLoading) {
    return (
      <AppShell>
        <LoadingScreen />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Goals"
        subtitle="Reserved money stays with the earning it came from — it just stops being spendable."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary h-11 px-5 text-sm"
          >
            <Plus className="w-4 h-4" /> New goal
          </button>
        }
      />

      <div className="inline-flex items-center gap-1 bg-white/50 rounded-full p-1 border border-white/70 mb-6">
        {TABS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTab(option.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-[--motion-base]",
              tab === option.value
                ? "bg-brand text-brand-ink shadow-sm"
                : "text-ink-2 hover:bg-white",
            )}
          >
            {option.label}
            <span className="ml-1.5 opacity-60 tabular">{counts[option.value]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Target className="w-16 h-16" />}
          title={tab === "active" ? "No active goals" : `Nothing ${tab} yet`}
          description={
            tab === "active"
              ? "Set a target and reserve money towards it from any of your earnings. A goal never completes on its own — you decide when the money is actually spent."
              : tab === "completed"
                ? "Goals you finish will be listed here, along with the expense each one created."
                : "Goals you abandon end up here. Their reserved money goes straight back to the earnings it came from."
          }
          action={
            tab === "active" ? (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="btn-primary h-12 px-8"
              >
                <Plus className="w-4 h-4" /> Create a goal
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              incomes={incomes}
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
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditing(null);
        }}
        format={format}
        goal={editing}
      />
    </AppShell>
  );
}
