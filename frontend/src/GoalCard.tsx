/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/GoalCard.tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGoal, completeGoal, allocateToGoal } from "./api/goals";
import type { Goal } from "./api/goals";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // NEW: Dropdown Menu
import {
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Target,
  IndianRupee,
  LineChart,
  Pencil,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // NEW: Manual state

  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const isCompleted = goal.currentValue >= goal.targetValue;
  const isOfficiallyCompleted = goal.completed;
  const remainingAmount = goal.targetValue - goal.currentValue;

  const onSuccessRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    queryClient.invalidateQueries({ queryKey: ["buckets"] });
    onGoalUpdated();
  };

  const contributeMutation = useMutation({
    mutationFn: (payload: { amount: number; type: "deposit" | "withdrawal" }) =>
      allocateToGoal(goal.id!, payload),
    onSuccess: () => {
      setAddAmount("");
      setSubtractAmount("");
      setAddDialogOpen(false);
      setSubtractDialogOpen(false);
      toast.success("Transaction completed successfully.");
      onSuccessRefresh();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || "Transaction failed."),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });

  const handleAdd = () => {
    const parsedAdd = parseFloat(addAmount);
    if (!isNaN(parsedAdd) && parsedAdd > 0 && parsedAdd <= remainingAmount) {
      contributeMutation.mutate({ amount: parsedAdd, type: "deposit" });
    }
  };

  const handleSubtract = () => {
    const parsedSub = parseFloat(subtractAmount);
    if (!isNaN(parsedSub) && parsedSub > 0 && parsedSub <= goal.currentValue) {
      contributeMutation.mutate({ amount: parsedSub, type: "withdrawal" });
    }
  };

  return (
    <>
      {/* DIALOGS EXTRACTED OUTSIDE TO PREVENT DROPDOWN INTERFERENCE */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <GoalForm
            initialData={goal}
            onGoalCreated={() => setEditDialogOpen(false)}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[32px] bg-[#F1F0E8] border-white shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] flex items-center gap-3">
              <Target
                className="w-6 h-6"
                style={{ color: goal.colour || "#89A8B2" }}
              />{" "}
              {goal.name} Progress
            </DialogTitle>
          </DialogHeader>
          <GoalChart goal={goal} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
              Delete Goal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#546e7a] font-medium">
              This will permanently lose all progress. Funds return to the
              unallocated pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 mt-4 w-full sm:space-x-0">
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] text-center">
              Allocate Funds
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Enter amount..."
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="h-12 rounded-2xl bg-white border-white/60 mb-2"
            />
            <div className="text-sm font-medium text-[#546e7a] flex justify-between px-1">
              <span>Max needed:</span>
              <span className="text-[#89A8B2]">
                ₹{remainingAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!addAmount || contributeMutation.isPending}
            className="btn-primary w-full h-12"
          >
            Confirm
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={subtractDialogOpen} onOpenChange={setSubtractDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] text-center">
              Free Up Funds
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              placeholder="Enter amount..."
              value={subtractAmount}
              onChange={(e) => setSubtractAmount(e.target.value)}
              className="h-12 rounded-2xl bg-white border-white/60 mb-2"
            />
            <div className="text-sm font-medium text-[#546e7a] flex justify-between px-1">
              <span>Currently Allocated:</span>
              <span className="text-[#89A8B2]">
                ₹{goal.currentValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <button
            onClick={handleSubtract}
            disabled={!subtractAmount || contributeMutation.isPending}
            className="btn-destructive w-full h-12 bg-[#BF4646]"
          >
            Confirm
          </button>
        </DialogContent>
      </Dialog>

      {/* CHANGED: The Horizontal Pill Design */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm hover:shadow-md transition-all gap-4">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-4 w-full md:w-1/3 min-w-[200px]">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-white/60 shrink-0">
            <Target
              className="w-5 h-5"
              style={{ color: goal.colour || "#89A8B2" }}
            />
          </div>
          <div className="truncate">
            <h3
              className="text-lg font-extrabold text-[#2c3e50] truncate"
              title={goal.name}
            >
              {goal.name}
            </h3>
            {isOfficiallyCompleted ? (
              <span className="text-xs font-bold text-[#89A8B2] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            ) : (
              <span className="text-xs font-bold text-[#546e7a]">
                Target: ₹{goal.targetValue.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Progress Bar */}
        <div className="w-full md:w-1/3 flex flex-col justify-center">
          <div className="flex justify-between text-xs font-bold mb-1.5 px-1">
            <span className="text-[#2c3e50] flex items-center">
              <IndianRupee className="w-3 h-3" />{" "}
              {goal.currentValue.toLocaleString("en-IN")}
            </span>
            <span className="text-[#546e7a]">{Math.floor(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-[#E5E1DA] rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: goal.colour || "#89A8B2",
              }}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full md:w-1/3 flex items-center justify-end gap-2">
          {!isOfficiallyCompleted && (
            <>
              {isCompleted ? (
                <button
                  onClick={() => completeMutation.mutate()}
                  className="h-10 px-4 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-sm transition-all"
                >
                  Finish
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAddDialogOpen(true)}
                    title="Allocate Funds"
                    className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#89A8B2] text-[#89A8B2] hover:text-white rounded-full border border-white shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSubtractDialogOpen(true)}
                    disabled={goal.currentValue <= 0}
                    title="Free Up Funds"
                    className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#546e7a] text-[#546e7a] hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#546e7a] rounded-full border border-white shadow-sm transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}

          {/* NEW: Secondary Actions behind Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-white/60 text-[#546e7a] rounded-full transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 rounded-2xl bg-white/95 backdrop-blur-xl border-white/60 shadow-xl p-1"
            >
              <DropdownMenuItem
                onSelect={() => setChartDialogOpen(true)}
                className="rounded-xl font-medium cursor-pointer py-2"
              >
                <LineChart className="w-4 h-4 mr-2" /> View Chart
              </DropdownMenuItem>
              {!isOfficiallyCompleted && (
                <DropdownMenuItem
                  onSelect={() => setEditDialogOpen(true)}
                  className="rounded-xl font-medium cursor-pointer py-2"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Edit Goal
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => setDeleteDialogOpen(true)}
                className="rounded-xl font-medium cursor-pointer py-2 text-[#BF4646] focus:bg-[#BF4646]/10 focus:text-[#BF4646]"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
