// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
// UPDATE - Importing the new API for completing goals

// UPDATE 2 - Including user verification based on JWT
import { getGoals, getCurrentUser } from "./api/goals";
import type { Goal } from "./api/goals";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  TrendingUp,
  // IndianRupee,
  Search,
  Filter,
  // Clock,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Grid3X3,
  List,
  Calendar,
  Volleyball,
  History, // NEW
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type ViewMode = "grid" | "list";
type SortOption = "name" | "progress" | "target" | "created" | "remaining";
type FilterOption = "all" | "active" | "completed" | "near-completion";

// NEW - Fetch User
// async function fetchUser() {
//   const res = await fetch("http://localhost:8000/auth/me", {
//     method: "GET",
//     credentials: "include",
//   });

//   if (!res.ok) {
//     throw new Error("Unauthorized");
//   }
//   return res.json();
// }

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // NEW

  // NEW - Send user back to the home page if they try to access without login:
  const navigate = useNavigate();

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await getGoals();
      setGoals(res.data);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verifyUserAndFetchGoals = async () => {
      try {
        // await fetchUser();
        await getCurrentUser();
        fetchGoals();
      } catch (error) {
        console.error("User verification failed:", error);
        navigate("/");
      }
    };
    verifyUserAndFetchGoals();
  }, [navigate]);

  useEffect(() => {
    const filterAndSortGoals = (goalsToProcess: Goal[]) => {
      const filtered = goalsToProcess.filter((goal) => {
        // Search filter
        const matchesSearch =
          goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          goal.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategory === "all" || goal.category === selectedCategory;

        // Status filter
        let matchesStatus = true;
        const progress = (goal.currentValue / goal.targetValue) * 100;

        if (!showHistory) {
          // Apply active filters only if not in history view
          switch (filterBy) {
            case "completed":
              matchesStatus = progress >= 100;
              break;
            case "active":
              matchesStatus = progress < 100 && progress > 0;
              break;
            case "near-completion":
              matchesStatus = progress >= 80 && progress < 100;
              break;
            default:
              matchesStatus = true;
          }
        }

        return matchesSearch && matchesCategory && matchesStatus;
      });

      // Sort goals
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
            return 0; // Keep original order for 'created'
        }
      });

      return filtered;
    };

    if (showHistory) {
      const completedGoals = goals.filter((goal) => goal.completed);
      setFilteredGoals(filterAndSortGoals(completedGoals));
    } else {
      const activeGoals = goals.filter((goal) => !goal.completed);
      setFilteredGoals(filterAndSortGoals(activeGoals));
    }
  }, [goals, searchTerm, selectedCategory, sortBy, filterBy, showHistory]);

  const handleGoalUpdate = () => {
    fetchGoals();
    setShowCreateForm(false);
  };

  // Calculate statistics
  const activeGoals = goals.filter((goal) => !goal.completed);
  const completedGoals = goals.filter((goal) => goal.completed);

  const stats = {
    total: activeGoals.length,
    completed: activeGoals.filter(
      (goal) => goal.currentValue >= goal.targetValue,
    ).length,
    inProgress: activeGoals.filter(
      (goal) => goal.currentValue > 0 && goal.currentValue < goal.targetValue,
    ).length,
    totalTarget: activeGoals.reduce((sum, goal) => sum + goal.targetValue, 0),
    totalSaved: activeGoals.reduce((sum, goal) => sum + goal.currentValue, 0),
  };

  const historyStats = {
    total: completedGoals.length,
    totalTarget: completedGoals.reduce(
      (sum, goal) => sum + goal.targetValue,
      0,
    ),
    totalSaved: completedGoals.reduce(
      (sum, goal) => sum + goal.currentValue,
      0,
    ),
  };

  const categories = [
    ...new Set(goals.map((goal) => goal.category).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
              <Volleyball className="w-10 h-10 text-yellow-300" />
              Goalie! <Volleyball className="w-10 h-10 text-yellow-300" />
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Track your savings, achieve your dreams, and celebrate your
              financial milestones
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-blue-200" />
                <div className="text-2xl font-bold">
                  {showHistory ? historyStats.total : stats.total}
                </div>
                <div className="text-sm text-blue-200">
                  {showHistory ? "Completed" : "Active Goals"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-300" />
                <div className="text-2xl font-bold">
                  {showHistory
                    ? `₹${historyStats.totalTarget.toLocaleString("en-IN")}`
                    : historyStats.total}
                </div>
                <div className="text-sm text-blue-200">
                  {showHistory ? "Achieved Targets" : "Completed"}
                </div>
              </CardContent>
            </Card>

            {/* <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-300" />
                <div className="text-2xl font-bold">
                  {showHistory
                    ? historyStats.totalTarget.toLocaleString("en-IN")
                    : stats.inProgress}
                </div>
                <div className="text-sm text-blue-200">
                  {showHistory ? "Total Target" : "In Progress"}
                </div>
              </CardContent>
            </Card> */}

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                <div className="text-2xl font-bold">
                  {showHistory
                    ? Math.round(
                        (historyStats.totalSaved / historyStats.totalTarget) *
                          100,
                      )
                    : stats.totalTarget > 0
                      ? Math.round((stats.totalSaved / stats.totalTarget) * 100)
                      : 0}
                  %
                </div>
                <div className="text-sm text-blue-200">
                  {showHistory ? "Average Success" : "Overall Progress"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <div className="mt-6 text-center">
            <p className="text-blue-100 mb-2">
              ₹
              {showHistory
                ? historyStats.totalSaved.toLocaleString("en-IN")
                : stats.totalSaved.toLocaleString("en-IN")}{" "}
              saved of ₹
              {showHistory
                ? historyStats.totalTarget.toLocaleString("en-IN")
                : stats.totalTarget.toLocaleString("en-IN")}{" "}
              target
            </p>
            <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-yellow-300 to-green-300 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${
                    (showHistory
                      ? historyStats.totalTarget
                      : stats.totalTarget) > 0
                      ? ((showHistory
                          ? historyStats.totalSaved
                          : stats.totalSaved) /
                          (showHistory
                            ? historyStats.totalTarget
                            : stats.totalTarget)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Controls Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Left side - Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search goals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              {!showHistory && (
                <Select
                  value={filterBy}
                  onValueChange={(value: FilterOption) => setFilterBy(value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Goals</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="near-completion">
                      Near Complete
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Right side - Sort, View Mode, and Create/History Buttons */}
            <div className="flex gap-3">
              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="target">Target Amount</SelectItem>
                  <SelectItem value="remaining">Remaining</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* NEW - History Toggle Button */}
              <Button
                variant={showHistory ? "default" : "outline"}
                className="flex items-center gap-2"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4" />
                {showHistory ? "Active Goals" : "View History"}
              </Button>

              {/* Create Goal Button */}
              <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={showHistory}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Goal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create a New Goal</DialogTitle>
                    <DialogDescription>
                      Set up a new financial milestone to track your savings
                      progress
                    </DialogDescription>
                  </DialogHeader>
                  <GoalForm onGoalCreated={handleGoalUpdate} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm ||
            selectedCategory !== "all" ||
            (!showHistory && filterBy !== "all")) && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-200"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Category: {selectedCategory}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-200"
                    onClick={() => setSelectedCategory("all")}
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {!showHistory && filterBy !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filterBy.replace("-", " ")}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-200"
                    onClick={() => setFilterBy("all")}
                  >
                    ×
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-gray-600">
            {filteredGoals.length === goals.length ? (
              <span>Showing all {goals.length} goals</span>
            ) : (
              <span>
                Showing {filteredGoals.length} of {goals.length} goals
              </span>
            )}
          </div>
          {filteredGoals.length > 0 && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Sorted by {sortBy.replace("-", " ")}
            </div>
          )}
        </div>

        {/* Goals Display */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              {goals.length === 0 ? (
                <>
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No goals yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Start your financial journey by creating your first savings
                    goal!
                  </p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Goal
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No matching goals
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Try adjusting your search terms or filters to find your
                    goals.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                      setFilterBy("all");
                    }}
                  >
                    Clear All Filters
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`${
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }`}
          >
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className={viewMode === "list" ? "max-w-none" : ""}
              >
                <GoalCard goal={goal} onGoalUpdated={fetchGoals} />
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats Footer
        {filteredGoals.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Quick Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(
                    filteredGoals.reduce(
                      (sum, goal) => sum + goal.currentValue,
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Saved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(
                    filteredGoals.reduce(
                      (sum, goal) => sum + goal.targetValue,
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Target</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {
                    filteredGoals.filter(
                      (goal) => goal.currentValue >= goal.targetValue
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(
                    (filteredGoals.reduce(
                      (sum, goal) => sum + goal.currentValue / goal.targetValue,
                      0
                    ) /
                      filteredGoals.length) *
                      100
                  )}
                  %
                </div>
                <div className="text-sm text-gray-500">Avg Progress</div>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
