/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/BucketCard.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBucket, deleteBucket, withdrawFromBucket } from "./api/goals";
import type { Bucket, Goal } from "./api/goals";
import { GoalCard } from "./GoalCard";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyBank, Trash2, Minus, Settings } from "lucide-react";
import { toast } from "sonner";

interface BucketCardProps {
  bucket: Bucket & { goals: Goal[] };
}

export function BucketCard({ bucket }: BucketCardProps) {
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: bucket.name,
    type: bucket.type,
  });
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const allocated = bucket.goals.reduce(
    (sum, goal) => sum + goal.currentValue,
    0,
  );
  const unallocated = bucket.totalBalance - allocated;
  const allocatedPercentage =
    bucket.totalBalance > 0 ? (allocated / bucket.totalBalance) * 100 : 0;

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["buckets"] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  const updateMutation = useMutation({
    mutationFn: () => updateBucket(bucket.id!, editForm),
    onSuccess: () => {
      toast.success("Bucket updated.");
      setEditOpen(false);
      refreshData();
    },
    onError: () => toast.error("Failed to update bucket."),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      withdrawFromBucket(bucket.id!, { amount: parseFloat(withdrawAmount) }),
    onSuccess: () => {
      toast.success("Funds withdrawn.");
      setWithdrawOpen(false);
      setWithdrawAmount("");
      refreshData();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || "Withdrawal failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBucket(bucket.id!),
    onSuccess: () => {
      toast.success("Bucket deleted.");
      setDeleteOpen(false);
      refreshData();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || "Cannot delete bucket."),
  });

  return (
    <>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
              Edit Bucket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#546e7a]">
                Bucket Name
              </Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="h-12 rounded-2xl bg-white border-white/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#546e7a]">
                Bucket Type
              </Label>
              <Select
                value={editForm.type}
                onValueChange={(val) => setEditForm({ ...editForm, type: val })}
              >
                {/* CHANGED: Added w-full so the dropdown spans the whole container */}
                <SelectTrigger className="w-full h-12 rounded-2xl bg-white border-white/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/60 bg-white">
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                  <SelectItem value="wallet">Physical Wallet</SelectItem>
                  <SelectItem value="investment">
                    Investment Portfolio
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editForm.name.trim()}
              className="btn-primary w-full h-12"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
              Withdraw
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              type="number"
              placeholder="Enter amount..."
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="h-12 rounded-2xl bg-white border-white/60"
            />
            <div className="text-sm font-medium text-[#546e7a] flex justify-between px-1">
              <span>Available:</span>
              <span className="text-[#89A8B2] font-bold">
                ₹{unallocated.toLocaleString("en-IN")}
              </span>
            </div>
            <button
              onClick={() => withdrawMutation.mutate()}
              disabled={
                withdrawMutation.isPending ||
                !withdrawAmount ||
                parseFloat(withdrawAmount) > unallocated
              }
              className="btn-destructive w-full h-12 bg-[#BF4646]"
            >
              Confirm Withdrawal
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-sm rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-extrabold text-[#2c3e50]">
              Delete Bucket?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#546e7a] font-medium">
              You can only delete this bucket if it has no active goals
              attached.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* CHANGED: Overrode ShadCN default sm:flex-row with sm:flex-col to perfectly stack the buttons */}
          <AlertDialogFooter className="flex flex-col sm:flex-col gap-3 mt-4 w-full sm:space-x-0">
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="btn-destructive w-full m-0 bg-[#BF4646]"
            >
              Yes, Delete
            </AlertDialogAction>
            <AlertDialogCancel className="btn-secondary w-full m-0 mt-0 sm:mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccordionItem
        value={bucket.id!}
        className="glass-card bg-white/40 rounded-[32px] overflow-hidden border-none shadow-sm mb-4"
      >
        <AccordionTrigger className="hover:no-underline py-6 px-6 md:px-8">
          <div className="flex flex-col lg:flex-row w-full justify-between items-start lg:items-center gap-6 pr-4">
            <div className="flex items-center gap-4 text-left min-w-[250px]">
              <div className="p-3 bg-[#89A8B2]/10 rounded-2xl">
                <PiggyBank className="w-8 h-8 text-[#89A8B2]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#2c3e50]">
                  {bucket.name}
                </h2>
                <div className="text-sm text-[#546e7a] font-medium mt-0.5">
                  <span className="capitalize">
                    {bucket.type.replace("_", " ")}
                  </span>{" "}
                  •{" "}
                  <span className="font-bold text-[#2c3e50]">
                    Total: ₹{bucket.totalBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/3 min-w-[200px]">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-[#546e7a]">
                  Allocated: ₹{allocated.toLocaleString("en-IN")}
                </span>
                <span className="text-[#89A8B2]">
                  ₹{unallocated.toLocaleString("en-IN")} Free
                </span>
              </div>
              <div className="h-3 w-full bg-white/80 rounded-full overflow-hidden shadow-inner flex">
                <div
                  className="h-full bg-[#89A8B2] transition-all duration-1000 ease-out"
                  style={{ width: `${allocatedPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setWithdrawOpen(true)}
                title="Withdraw Funds"
                className="w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-[#546e7a] hover:text-[#2c3e50] rounded-full border border-white/60 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditOpen(true)}
                title="Edit Bucket"
                className="w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-[#546e7a] hover:text-[#2c3e50] rounded-full border border-white/60 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                title="Delete Bucket"
                className="w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-[#BF4646] hover:text-white text-[#BF4646] rounded-full border border-white/60 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-6 md:px-8 pb-6">
          {bucket.goals.length === 0 ? (
            <div className="text-center py-6 bg-white/30 rounded-2xl border border-white/40 border-dashed mt-2">
              <p className="text-[#546e7a] font-medium">
                No active goals attached.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {bucket.goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onGoalUpdated={() => {}} />
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </>
  );
}
