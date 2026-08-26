// frontend/src/GoalForm.tsx
// Create or edit a goal. Money never enters here — a goal starts empty and is funded
// by reserving from specific incomes afterwards.
import { useEffect, useState } from "react";

import { createGoal, updateGoal } from "@/api";
import type { Goal } from "@/api/types";
import { useLedgerMutation } from "@/hooks/queries";
import { minorToInput, parseMoneyInput, type MoneyFormat } from "@/lib/money";
import { MoneyInput } from "@/components/form-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: MoneyFormat;
  goal?: Goal | null;
}

export function GoalForm({ open, onOpenChange, format, goal }: GoalFormProps) {
  const isEdit = Boolean(goal);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setDescription(goal?.description ?? "");
    setTarget(goal ? minorToInput(goal.targetValue) : "");
    setDeadline(goal?.deadline ? goal.deadline.slice(0, 10) : "");
  }, [open, goal]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto no-scrollbar rounded-[32px] bg-canvas border-hairline p-6">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-ink-1">
            {isEdit ? "Edit goal" : "New goal"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-5 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) mutation.mutate(undefined as void);
          }}
        >
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">What are you saving for?</Label>
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New iPhone"
              className="field"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">Target amount</Label>
            <MoneyInput value={target} onChange={setTarget} format={format} />
            {belowReserved && (
              <p className="text-xs font-semibold text-critical">
                You have already reserved more than this. Release some of it first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">
              Deadline <span className="font-normal text-ink-3">(optional)</span>
            </Label>
            <Input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="field"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink-2">
              Notes <span className="font-normal text-ink-3">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="rounded-2xl bg-white border-hairline resize-none"
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="btn-primary w-full h-12">
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
