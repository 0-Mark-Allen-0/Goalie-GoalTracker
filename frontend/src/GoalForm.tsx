// frontend/src/GoalForm.tsx
// Create or edit a goal. Money never enters here — a goal starts empty and is funded
// by reserving from specific incomes afterwards.
import { useId, useState } from "react";

import { createGoal, updateGoal } from "@/api";
import type { Goal } from "@/api/types";
import { useLedgerMutation } from "@/hooks/queries";
import { minorToInput, parseMoneyInput, type MoneyFormat } from "@/lib/money";
import { MoneyInput } from "@/components/form-controls";
import { FloatingInput, FloatingTextarea } from "@/components/floating-field";
import { RecordFormDialog } from "@/components/record-form-dialog";

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: MoneyFormat;
  goal?: Goal | null;
}

export function GoalForm({ open, onOpenChange, format, goal }: GoalFormProps) {
  return (
    <RecordFormDialog open={open} onOpenChange={onOpenChange} title={goal ? "Edit goal" : "New goal"}>
      <GoalFields key={goal?.id ?? "new"} goal={goal} format={format} onOpenChange={onOpenChange} />
    </RecordFormDialog>
  );
}

function GoalFields({ onOpenChange, format, goal }: Omit<GoalFormProps, "open">) {
  const isEdit = Boolean(goal);
  const errorId = useId();
  const [name, setName] = useState(goal?.name ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [target, setTarget] = useState(() => goal ? minorToInput(goal.targetValue) : "");
  const [deadline, setDeadline] = useState(() => goal?.deadline?.slice(0, 10) ?? "");

  const targetValue = parseMoneyInput(target, format) ?? 0;

  const mutation = useLedgerMutation(
    async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        targetValue,
        deadline: deadline ? `${deadline}T00:00:00Z` : null,
      };
      if (goal) return (await updateGoal(goal.id, payload)).data;
      return (await createGoal(payload)).data;
    },
    {
      successMessage: isEdit ? "Goal updated." : "Goal created.",
      onSuccess: () => onOpenChange(false),
    },
  );

  // Lowering the target below what is already reserved would strand the difference,
  // so it is blocked here as well as on the server.
  const belowReserved = Boolean(goal && targetValue > 0 && targetValue < goal.saved);
  const canSubmit = name.trim().length > 0 && targetValue > 0 && !belowReserved && !mutation.isPending;

  return (
    <form
      className="record-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) mutation.mutate(undefined as void);
      }}
    >
      <FloatingInput
        label="What are you saving for?"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="New iPhone"
      />
      <div className="space-y-1.5">
        <MoneyInput
          label="Target amount"
          required
          value={target}
          onChange={setTarget}
          format={format}
          invalid={belowReserved}
          describedBy={belowReserved ? errorId : undefined}
        />
        {belowReserved && (
          <p id={errorId} className="text-xs font-semibold text-critical">
            You have already reserved more than this. Release some of it first.
          </p>
        )}
      </div>
      <FloatingInput
        label="Deadline"
        type="date"
        value={deadline}
        onChange={(event) => setDeadline(event.target.value)}
      />
      <FloatingTextarea
        label="Notes"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
      />
      <button type="submit" disabled={!canSubmit} className="btn-primary w-full h-12">
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
      </button>
    </form>
  );
}
