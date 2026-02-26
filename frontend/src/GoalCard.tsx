"use client";

// import type React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGoal, completeGoal, addContribution } from "./api/goals";
import type { Goal } from "./api/goals";
// import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Target,
  IndianRupee,
  LineChart,
  Pencil,
} from "lucide-react";

import { GoalForm } from "./GoalForm";
import { GoalChart } from "./GoalChart";

interface GoalCardProps {
  goal: Goal;
  onGoalUpdated: () => void;
}

export function GoalCard({ goal, onGoalUpdated }: GoalCardProps) {
  const queryClient = useQueryClient();
  const [addAmount, setAddAmount] = useState<string>("");
  const [subtractAmount, setSubtractAmount] = useState<string>("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [subtractDialogOpen, setSubtractDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);

  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const isCompleted = goal.currentValue >= goal.targetValue;
  const isOfficiallyCompleted = goal.completed;
  const remainingAmount = goal.targetValue - goal.currentValue;

  const onSuccessRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    onGoalUpdated();
  };

  const contributeMutation = useMutation({
    mutationFn: (payload: { amount: number; type: "deposit" | "withdrawal" }) =>
      addContribution(goal.id!, payload),
    onSuccess: () => {
      setAddAmount("");
      setSubtractAmount("");
      setAddDialogOpen(false);
      setSubtractDialogOpen(false);
      onSuccessRefresh();
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });

  const isLoading =
    contributeMutation.isPending ||
    completeMutation.isPending ||
    deleteMutation.isPending;

  const parsedAdd = Number.parseFloat(addAmount);
  const isAddInvalid =
    isNaN(parsedAdd) || parsedAdd <= 0 || parsedAdd > remainingAmount;

  const parsedSub = Number.parseFloat(subtractAmount);
  const isSubInvalid =
    isNaN(parsedSub) || parsedSub <= 0 || parsedSub > goal.currentValue;

  const handleAdd = () => {
    if (isAddInvalid) return;
    contributeMutation.mutate({ amount: parsedAdd, type: "deposit" });
  };

  const handleSubtract = () => {
    if (isSubInvalid) return;
    contributeMutation.mutate({ amount: parsedSub, type: "withdrawal" });
  };

  return (
    <div className="glass-card flex flex-col h-[420px] relative overflow-hidden group">
      <div
        className="absolute top-0 left-0 w-full h-2 opacity-80"
        style={{ backgroundColor: goal.colour || "#89A8B2" }}
      />

      {isOfficiallyCompleted ? (
        <div className="absolute top-5 right-5 bg-[#E5E1DA] text-[#546e7a] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border border-white">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
        </div>
      ) : isCompleted ? (
        <div className="absolute top-5 right-5 bg-[#B3C8CF]/30 text-[#2c3e50] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border border-white">
          <Target className="w-3.5 h-3.5" /> Target Reached
        </div>
      ) : null}

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4 mt-2">
          <div className="flex items-center gap-3 w-full pr-2">
            <div className="p-3 rounded-2xl bg-white/60 shadow-sm border border-white shrink-0">
              <Target
                className="w-6 h-6"
                style={{ color: goal.colour || "#89A8B2" }}
              />
            </div>
            <h3
              className="text-xl font-extrabold text-[#2c3e50] truncate pr-2"
              title={goal.name}
            >
              {goal.name}
            </h3>
          </div>

          {!isOfficiallyCompleted && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <button className="p-2 bg-white/40 hover:bg-white/80 rounded-full text-[#89A8B2] hover:text-[#2c3e50] transition-colors shadow-sm border border-white/60 shrink-0">
                  <Pencil className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
                <GoalForm
                  initialData={goal}
                  onGoalCreated={() => setEditDialogOpen(false)}
                  onCancel={() => setEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <p className="text-sm text-[#546e7a] font-medium leading-relaxed line-clamp-2 mb-6 flex-1">
          {goal.description}
        </p>

        <div className="space-y-3 mb-6 bg-white/40 p-4 rounded-3xl border border-white/60 shadow-sm">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#89A8B2] uppercase tracking-wider mb-1">
                Saved
              </span>
              <span className="text-2xl font-extrabold text-[#2c3e50] flex items-center">
                <IndianRupee className="w-5 h-5 mr-0.5 opacity-70" />{" "}
                {goal.currentValue.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-[#546e7a] uppercase tracking-wider mb-1">
                Target
              </span>
              <span className="text-lg font-bold text-[#546e7a] flex items-center justify-end">
                <IndianRupee className="w-4 h-4 mr-0.5 opacity-50" />{" "}
                {goal.targetValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="relative w-full h-2.5 bg-[#E5E1DA] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: goal.colour || "#89A8B2",
              }}
            />
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {isOfficiallyCompleted ? (
            <div className="flex gap-3">
              <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
                <DialogTrigger asChild>
                  <button className="btn-secondary flex-1">
                    <LineChart className="w-4 h-4" /> View Chart
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl rounded-[32px] bg-[#F1F0E8] border-white shadow-2xl p-8">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] flex items-center gap-3">
                      <Target
                        className="w-6 h-6"
                        style={{ color: goal.colour || "#89A8B2" }}
                      />
                      {goal.name} History
                    </DialogTitle>
                  </DialogHeader>
                  <GoalChart goal={goal} />
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={isLoading}
                    className="btn-destructive w-14 !px-0 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
                      Delete History?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#546e7a] font-medium">
                      Are you sure you want to permanently delete "{goal.name}"
                      from your history?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {/* OVERRIDDEN FLEX STYLES TO FORCE STACKING */}
                  <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 mt-4 sm:space-x-0 w-full">
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="btn-destructive w-full m-0 bg-[#BF4646]"
                    >
                      Yes, Delete
                    </AlertDialogAction>
                    <AlertDialogCancel className="btn-secondary w-full m-0">
                      Cancel
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      disabled={isLoading || isCompleted}
                      className="btn-primary flex-1"
                    >
                      <Plus className="w-5 h-5" /> Add
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] text-center">
                        Add Funds
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        type="number"
                        placeholder="Enter amount..."
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        className={`h-14 rounded-2xl text-lg bg-white border-white shadow-sm px-4 ${parsedAdd > remainingAmount ? "border-[#BF4646]" : ""}`}
                      />
                      <div className="flex justify-between mt-3 px-1 text-sm font-medium">
                        <span className="text-[#546e7a]">Max allowed:</span>
                        <span className="text-[#89A8B2]">
                          ₹{remainingAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleAdd}
                        disabled={!addAmount || isAddInvalid || isLoading}
                        className="btn-primary w-full"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setAddDialogOpen(false)}
                        className="btn-secondary w-full"
                      >
                        Cancel
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={subtractDialogOpen}
                  onOpenChange={setSubtractDialogOpen}
                >
                  <DialogTrigger asChild>
                    <button
                      disabled={goal.currentValue <= 0 || isLoading}
                      className="btn-secondary flex-1"
                    >
                      <Minus className="w-5 h-5" /> Sub
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] text-center">
                        Withdraw Funds
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        type="number"
                        placeholder="Enter amount..."
                        value={subtractAmount}
                        onChange={(e) => setSubtractAmount(e.target.value)}
                        className={`h-14 rounded-2xl text-lg bg-white border-white shadow-sm px-4 ${parsedSub > goal.currentValue ? "border-[#BF4646]" : ""}`}
                      />
                      <div className="flex justify-between mt-3 px-1 text-sm font-medium">
                        <span className="text-[#546e7a]">Available:</span>
                        <span className="text-[#89A8B2]">
                          ₹{goal.currentValue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleSubtract}
                        disabled={!subtractAmount || isSubInvalid || isLoading}
                        className="btn-destructive w-full bg-[#BF4646]"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setSubtractDialogOpen(false)}
                        className="btn-secondary w-full"
                      >
                        Cancel
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex gap-3">
                <Dialog
                  open={chartDialogOpen}
                  onOpenChange={setChartDialogOpen}
                >
                  <DialogTrigger asChild>
                    <button className="btn-secondary flex-1 border-dashed">
                      <LineChart className="w-4 h-4" /> Chart
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl rounded-[32px] bg-[#F1F0E8] border-white shadow-2xl p-8">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] flex items-center gap-3">
                        <Target
                          className="w-6 h-6"
                          style={{ color: goal.colour || "#89A8B2" }}
                        />
                        {goal.name} Progress
                      </DialogTitle>
                    </DialogHeader>
                    <GoalChart goal={goal} />
                  </DialogContent>
                </Dialog>

                {isCompleted ? (
                  <button
                    onClick={() => completeMutation.mutate()}
                    disabled={isLoading}
                    className="btn-primary flex-1 !bg-green-600"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Finish
                  </button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        disabled={isLoading}
                        className="btn-secondary w-14 !px-0 flex-shrink-0 text-[#BF4646]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
                          Delete Goal?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#546e7a] font-medium">
                          This will permanently lose all progress for "
                          {goal.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      {/* OVERRIDDEN FLEX STYLES TO FORCE STACKING */}
                      <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 mt-4 sm:space-x-0 w-full">
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="btn-destructive w-full m-0 bg-[#BF4646]"
                        >
                          Yes, Delete
                        </AlertDialogAction>
                        <AlertDialogCancel className="btn-secondary w-full m-0">
                          Cancel
                        </AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
