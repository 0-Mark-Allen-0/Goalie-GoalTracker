import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGoals, getCurrentUser } from "./api/goals";
import type { Goal } from "./api/goals";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Target,
  Plus,
  Search,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  History,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type SortOption = "name" | "progress" | "target" | "created" | "remaining";
type FilterOption = "all" | "active" | "completed" | "near-completion";

const EMPTY_GOALS: Goal[] = [];

export function Dashboard() {
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        navigate("/");
      }
    };
    verifyUser();
  }, [navigate]);

  const { data: response, isLoading: loading } = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });

  const goals = response?.data || EMPTY_GOALS;

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

    if (showHistory) {
      setFilteredGoals(filterAndSortGoals(goals.filter((g) => g.completed)));
    } else {
      setFilteredGoals(filterAndSortGoals(goals.filter((g) => !g.completed)));
    }
  }, [goals, searchTerm, selectedCategory, sortBy, showHistory]);

  // Unified Statistics
  const activeGoalsCount = goals.filter((g) => !g.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;
  const totalMoneySpent = goals.reduce((sum, g) => sum + g.currentValue, 0);

  const categories = [...new Set(goals.map((g) => g.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0E8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89A8B2]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-[#F1F0E8]">
      {/* Soft Header Section */}
      <div className="bg-[#E5E1DA] pt-12 pb-24 relative overflow-hidden rounded-b-[48px] shadow-sm">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#B3C8CF]/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#2c3e50] tracking-tight mb-4 flex items-center justify-center gap-3">
              <Wallet className="w-10 h-10 text-[#89A8B2]" /> Goalie
            </h1>
            <p className="text-[#546e7a] text-lg font-medium max-w-2xl mx-auto">
              Your beautifully organized financial ledger.
            </p>
          </div>

          {/* Liquid Glass Stats Cards - Unified */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 flex flex-col items-center text-center">
              <Target className="w-8 h-8 mb-3 text-[#89A8B2]" />
              <div className="text-3xl font-extrabold text-[#2c3e50]">
                {activeGoalsCount}
              </div>
              <div className="text-[#546e7a] font-medium mt-1">
                Active Goals
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center text-center">
              <CheckCircle2 className="w-8 h-8 mb-3 text-[#B3C8CF]" />
              <div className="text-3xl font-extrabold text-[#2c3e50]">
                {completedGoalsCount}
              </div>
              <div className="text-[#546e7a] font-medium mt-1">Completed</div>
            </div>

            <div className="glass-card p-6 flex flex-col items-center text-center">
              <Wallet className="w-8 h-8 mb-3 text-[#89A8B2]" />
              <div className="text-3xl font-extrabold text-[#2c3e50]">
                ₹{totalMoneySpent.toLocaleString("en-IN")}
              </div>
              <div className="text-[#546e7a] font-medium mt-1">Money Spent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 -mt-12 relative z-20">
        {/* MD3 Controls Panel */}
        <div className="glass-card p-4 md:p-6 mb-8 flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/70">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#89A8B2]" />
              <Input
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 rounded-2xl bg-white/80 border-white/60 shadow-sm h-12 text-[#2c3e50] font-medium placeholder:text-[#89A8B2] focus-visible:ring-[#89A8B2] transition-all"
              />
            </div>

            {/* Styled ShadCN Select for Category */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[180px] rounded-2xl bg-white/80 h-12 border-white/60 shadow-sm text-[#2c3e50] font-bold focus:ring-[#89A8B2] transition-all">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-[#F1F0E8]/95 backdrop-blur-xl border-white/60 shadow-xl overflow-hidden p-1">
                <SelectItem
                  value="all"
                  className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                >
                  All Categories
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
            {/* Styled ShadCN Select for Sort */}
            <Select
              value={sortBy}
              onValueChange={(v: SortOption) => setSortBy(v)}
            >
              <SelectTrigger className="w-[150px] rounded-2xl bg-white/80 h-12 border-white/60 shadow-sm text-[#2c3e50] font-bold focus:ring-[#89A8B2] transition-all">
                <BarChart3 className="w-4 h-4 mr-2 text-[#89A8B2]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-[#F1F0E8]/95 backdrop-blur-xl border-white/60 shadow-xl overflow-hidden p-1">
                <SelectItem
                  value="created"
                  className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                >
                  Date Created
                </SelectItem>
                <SelectItem
                  value="name"
                  className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                >
                  Name
                </SelectItem>
                <SelectItem
                  value="progress"
                  className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                >
                  Progress
                </SelectItem>
                <SelectItem
                  value="remaining"
                  className="rounded-xl font-medium focus:bg-[#E5E1DA] focus:text-[#2c3e50] cursor-pointer transition-colors"
                >
                  Remaining
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`h-12 rounded-full px-6 flex items-center justify-center gap-2 font-semibold transition-all duration-200 shadow-sm ${
                showHistory
                  ? "bg-[#89A8B2] text-white shadow-md hover:bg-[#7a96a0]"
                  : "bg-white/80 text-[#546e7a] border border-white/60 hover:bg-white"
              }`}
            >
              <History className="w-4 h-4" />{" "}
              {showHistory ? "Active Goals" : "View History"}
            </button>

            {/* Create Goal Dialog */}
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <button
                  disabled={showHistory}
                  className="btn-primary h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> New Goal
                </button>
              </DialogTrigger>
              <DialogContent className="[&>button]:hidden max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-0 bg-transparent shadow-none">
                <GoalForm onGoalCreated={() => setShowCreateForm(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Goals Grid - Wrapped in an animated div keyed by showHistory for smooth transitions */}
        <div
          key={showHistory ? "history" : "active"}
          className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both"
        >
          {filteredGoals.length === 0 ? (
            <div className="text-center py-20 glass-card bg-white/50">
              <AlertCircle className="w-16 h-16 text-[#B3C8CF] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#2c3e50] mb-2">
                No goals found
              </h3>
              <p className="text-[#546e7a] font-medium">
                Create a new goal or adjust your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onGoalUpdated={() => {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
