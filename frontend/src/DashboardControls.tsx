/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/DashboardControls.tsx
import { Search, BarChart3, History, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// NEW: Separated Props interface for strict typing
interface DashboardControlsProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  sortBy: string;
  setSortBy: (val: any) => void;
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;
  categories: string[];
  onNewBucketClick: () => void;
  onNewGoalClick: () => void;
  disableNewGoal: boolean;
}

export function DashboardControls({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  showHistory,
  setShowHistory,
  categories,
  onNewBucketClick,
  onNewGoalClick,
  disableNewGoal,
}: DashboardControlsProps) {
  return (
    <div className="glass-card p-4 md:p-6 mb-8 flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/70 rounded-[24px]">
      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#89A8B2]" />
          <Input
            placeholder="Search goals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 rounded-2xl bg-white/80 border-white/60 shadow-sm h-12 text-[#2c3e50] font-medium placeholder:text-[#89A8B2] focus-visible:ring-[#89A8B2] transition-all"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
        <Select value={sortBy} onValueChange={setSortBy}>
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

        <button
          onClick={onNewBucketClick}
          disabled={showHistory}
          className="btn-secondary h-12 disabled:opacity-50 bg-white/80"
        >
          <Plus className="w-4 h-4" /> New Bucket
        </button>

        <button
          onClick={onNewGoalClick}
          disabled={showHistory || disableNewGoal}
          className="btn-primary h-12 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>
    </div>
  );
}
