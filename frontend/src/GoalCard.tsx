"use client";

import type React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteGoal, completeGoal, addContribution } from "./api/goals";
import type { Goal } from "./api/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Target,
  IndianRupee,
} from "lucide-react";

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

  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const isCompleted = goal.currentValue >= goal.targetValue;
  const isOfficiallyCompleted = goal.completed;
  const remainingAmount = goal.targetValue - goal.currentValue;

  // Unified UI Refresh behavior
  const onSuccessRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    onGoalUpdated(); // Kept for prop backward compatibility
  };

  // Mutation: Ledger Contributions
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

  // Mutation: Complete Goal
  const completeMutation = useMutation({
    mutationFn: () => completeGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });

  // Mutation: Delete Goal
  const deleteMutation = useMutation({
    mutationFn: () => deleteGoal(goal.id!),
    onSuccess: onSuccessRefresh,
  });

  // Global loading state for all card actions
  const isLoading =
    contributeMutation.isPending ||
    completeMutation.isPending ||
    deleteMutation.isPending;

  const handleAdd = () => {
    const amount = Number.parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return;
    const finalAmount = Math.min(amount, remainingAmount);
    contributeMutation.mutate({ amount: finalAmount, type: "deposit" });
  };

  const handleSubtract = () => {
    const amount = Number.parseFloat(subtractAmount);
    if (isNaN(amount) || amount <= 0) return;
    const finalAmount = Math.min(amount, goal.currentValue);
    contributeMutation.mutate({ amount: finalAmount, type: "withdrawal" });
  };

  const handleComplete = () => completeMutation.mutate();
  const handleDelete = () => deleteMutation.mutate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-[400px] group relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 w-full h-1.5"
        style={{ backgroundColor: goal.colour }}
      />

      {/* Completion badge */}
      {isOfficiallyCompleted ? (
        <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </div>
      ) : isCompleted ? (
        <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Target className="w-3 h-3" />
          Target Reached
        </div>
      ) : null}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: goal.colour }} />
          {goal.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {goal.description}
        </p>

        {/* Progress section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900 flex items-center gap-1">
              <IndianRupee className="w-5 h-5" />
              {goal.currentValue.toLocaleString("en-IN")}
            </span>
            <span className="text-lg text-gray-500 flex items-center gap-1">
              <IndianRupee className="w-4 h-4" />
              {goal.targetValue.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-2">
            <Progress
              value={progress}
              className="h-3 bg-gray-200"
              style={
                {
                  "--progress-foreground": goal.colour,
                } as React.CSSProperties
              }
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progress.toFixed(1)}% completed</span>
              {!isCompleted && (
                <span>{formatCurrency(remainingAmount)} remaining</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {isOfficiallyCompleted ? (
            <div className="space-y-2">
              <div className="text-center py-4 w-full">
                <Label className="text-lg">🥳 Goal Completed! 🥳</Label>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Goal
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Completed Goal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{goal.name}</strong>? This will permanently remove
                      this completed goal from your history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      Yes, Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <>
              {/* Row: Add + Subtract */}
              <div className="flex gap-2">
                {/* Add Amount Dialog */}
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      disabled={isLoading || isCompleted}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Amount to Goal</DialogTitle>
                      <DialogDescription>
                        How much would you like to add to{" "}
                        <strong>{goal.name}</strong>?
                        {remainingAmount > 0 && (
                          <span className="block mt-2 text-sm">
                            Maximum amount you can add:{" "}
                            {formatCurrency(remainingAmount)}
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="add-amount">Amount (INR)</Label>
                      <Input
                        id="add-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        min="1"
                        max={remainingAmount}
                        className="mt-2"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAdd}
                        disabled={
                          !addAmount ||
                          Number.parseFloat(addAmount) <= 0 ||
                          Number.parseFloat(addAmount) > remainingAmount ||
                          isLoading
                        }
                      >
                        Add Amount
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Subtract Amount Dialog */}
                <Dialog
                  open={subtractDialogOpen}
                  onOpenChange={setSubtractDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                      disabled={
                        goal.currentValue <= 0 || isLoading || isCompleted
                      }
                    >
                      <Minus className="w-4 h-4" />
                      Subtract
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Subtract Amount from Goal</DialogTitle>
                      <DialogDescription>
                        How much would you like to subtract from{" "}
                        <strong>{goal.name}</strong>?
                        <span className="block mt-2 text-sm">
                          Maximum amount you can subtract:{" "}
                          {formatCurrency(goal.currentValue)}
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="subtract-amount">Amount (INR)</Label>
                      <Input
                        id="subtract-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={subtractAmount}
                        onChange={(e) => setSubtractAmount(e.target.value)}
                        min="1"
                        max={goal.currentValue}
                        className="mt-2"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSubtractDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubtract}
                        disabled={
                          !subtractAmount ||
                          Number.parseFloat(subtractAmount) <= 0 ||
                          Number.parseFloat(subtractAmount) >
                            goal.currentValue ||
                          isLoading
                        }
                      >
                        Subtract Amount
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Row: Complete + Delete */}
              <div className="flex gap-2">
                {/* Complete Goal AlertDialog */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                      disabled={isLoading || !isCompleted}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>🎉 Congratulations!</AlertDialogTitle>
                      <AlertDialogDescription>
                        You've reached your target for{" "}
                        <strong>{goal.name}</strong>! Would you like to mark
                        this goal as officially complete? This will move it to
                        your history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Not Yet</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleComplete}
                        disabled={isLoading}
                      >
                        Yes, Mark Complete!
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete Goal */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1 flex items-center gap-2"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        <strong>{goal.name}</strong>? This action cannot be
                        undone and all progress will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isLoading}
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
