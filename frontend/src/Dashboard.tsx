/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGoals,
  getBuckets,
  getCurrentUser,
  createBucket,
} from "./api/goals";
import type { Goal, Bucket } from "./api/goals"; // CHANGED: Ensure User is exported from api/goals
import { GoalForm } from "./GoalForm";
import { BucketCard } from "./BucketCard";
import { DashboardControls } from "./DashboardControls"; // NEW: Extracted Controls
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, // NEW: Shadcn Accordion
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, PiggyBank, AlertCircle, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SortOption = "name" | "progress" | "target" | "created" | "remaining";

const EMPTY_GOALS: Goal[] = [];
const EMPTY_BUCKETS: Bucket[] = [];

export function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // STATES
  const [user, setUser] = useState<any>(null); // NEW: User State for Header
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBucketForm, setShowBucketForm] = useState(false);

  const [newBucket, setNewBucket] = useState<Partial<Bucket>>({
    name: "",
    type: "bank_account",
    totalBalance: 0,
  });

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await getCurrentUser();
        setUser(res.data); // CHANGED: Saving user data
      } catch (error) {
        navigate("/");
      }
    };
    verifyUser();
  }, [navigate]);

  const { data: goalsResponse, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });
  const { data: bucketsResponse, isLoading: bucketsLoading } = useQuery({
    queryKey: ["buckets"],
    queryFn: getBuckets,
  });

  const goals = goalsResponse?.data || EMPTY_GOALS;
  const buckets = bucketsResponse?.data || EMPTY_BUCKETS;

  const createBucketMutation = useMutation({
    mutationFn: (bucket: Partial<Bucket>) => createBucket(bucket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buckets"] });
      setShowBucketForm(false);
      setNewBucket({ name: "", type: "bank_account", totalBalance: 0 });
      toast.success("Bucket created successfully!");
    },
    onError: () => toast.error("Failed to create bucket."),
  });

  const handleCreateBucket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucket.name?.trim()) {
      toast.error("Bucket name is required");
      return;
    }
    createBucketMutation.mutate(newBucket);
  };

  useEffect(() => {
    const filterAndSortGoals = (goalsToProcess: Goal[]) => {
      const filtered = goalsToProcess.filter((goal) => {
        const matchesSearch =
          goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          goal.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || goal.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });

      filtered.sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "progress":
            return (
              b.currentValue / b.targetValue - a.currentValue / a.targetValue
            );
          case "target":
            return b.targetValue - a.targetValue;
          case "remaining":
            return (
              b.targetValue - b.currentValue - (a.targetValue - a.currentValue)
            );
          default:
            return 0;
        }
      });
      return filtered;
    };

    setFilteredGoals(
      filterAndSortGoals(
        goals.filter((g) => (showHistory ? g.completed : !g.completed)),
      ),
    );
  }, [goals, searchTerm, selectedCategory, sortBy, showHistory]);

  const bucketsWithGoals = useMemo(() => {
    return buckets.map((bucket) => {
      const bucketGoals = filteredGoals.filter((g) => g.bucketId === bucket.id);
      return { ...bucket, goals: bucketGoals };
    });
  }, [buckets, filteredGoals]);

  const categories = [...new Set(goals.map((g) => g.category).filter(Boolean))];

  if (goalsLoading || bucketsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0E8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89A8B2]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F0E8] pb-12">
      {/* CHANGED: New Minimal Header */}
      <header className="bg-[#E5E1DA]/50 backdrop-blur-md border-b border-white/40 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#89A8B2] p-2 rounded-xl text-white shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#2c3e50] tracking-tight">
              Goalie
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/statistics")}
              className="flex items-center gap-2 text-[#546e7a] bg-white/60 hover:text-[#89A8B2] font-bold transition-colors border-2 p-2 rounded-2xl"
            >
              <TrendingUp className="w-5 h-5" /> Stats
            </button>
            <div className="text-[#546e7a] font-bold text-lg border-l border-white/60 pl-6 hidden sm:block">
              Welcome,{" "}
              <span className="text-[#2c3e50]">{user?.name || "User"}</span>!
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 pt-10 relative z-20">
        {/* NEW: Render Extracted Controls */}
        <DashboardControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          categories={categories}
          onNewBucketClick={() => setShowBucketForm(true)}
          onNewGoalClick={() => setShowCreateForm(true)}
          disableNewGoal={buckets.length === 0}
        />

        {/* Dialogs for Form Creation */}
        <Dialog open={showBucketForm} onOpenChange={setShowBucketForm}>
          <DialogContent className="sm:max-w-md rounded-[32px] bg-[#F1F0E8] border-white shadow-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-[#2c3e50] flex items-center gap-2">
                <PiggyBank className="w-6 h-6 text-[#89A8B2]" /> Create a Bucket
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBucket} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#546e7a]">
                  Bucket Name
                </Label>
                <Input
                  placeholder="e.g., Emergency Fund"
                  value={newBucket.name}
                  onChange={(e) =>
                    setNewBucket({ ...newBucket, name: e.target.value })
                  }
                  className="h-12 rounded-2xl bg-white border-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#546e7a]">
                  Bucket Type
                </Label>
                <Select
                  value={newBucket.type}
                  onValueChange={(val) =>
                    setNewBucket({ ...newBucket, type: val })
                  }
                >
                  <SelectTrigger className="h-12 rounded-2xl bg-white border-white/60">
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
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#546e7a]">
                  Initial Balance (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={newBucket.totalBalance || ""}
                  onChange={(e) =>
                    setNewBucket({
                      ...newBucket,
                      totalBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-12 rounded-2xl bg-white border-white/60"
                />
              </div>
              <button
                type="submit"
                disabled={createBucketMutation.isPending}
                className="btn-primary w-full h-12 mt-4"
              >
                {createBucketMutation.isPending
                  ? "Creating..."
                  : "Create Bucket"}
              </button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="[&>button]:hidden max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-0 bg-transparent shadow-none">
            <GoalForm onGoalCreated={() => setShowCreateForm(false)} />
          </DialogContent>
        </Dialog>

        {/* CHANGED: Accordion Wrapper for Buckets */}
        <div
          key={showHistory ? "history" : "active"}
          className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both"
        >
          {bucketsWithGoals.length === 0 ? (
            <div className="text-center py-20 glass-card bg-white/50 flex flex-col items-center">
              <AlertCircle className="w-16 h-16 text-[#B3C8CF] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#2c3e50] mb-2">
                No Buckets Found
              </h3>
              <p className="text-[#546e7a] font-medium mb-6">
                Create a financial bucket first to start allocating goals.
              </p>
              <button
                onClick={() => setShowBucketForm(true)}
                className="btn-primary h-12 px-8"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Your First Bucket
              </button>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-6">
              {bucketsWithGoals.map((bucket) => {
                if (
                  bucket.goals.length === 0 &&
                  (searchTerm || selectedCategory !== "all" || showHistory)
                ) {
                  return null;
                }
                return <BucketCard key={bucket.id} bucket={bucket} />;
              })}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
