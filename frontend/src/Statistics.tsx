// frontend/src/Statistics.tsx
import { useQuery } from "@tanstack/react-query";
import { getGoals, getBuckets } from "./api/goals";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Target,
  CheckCircle2,
  PiggyBank,
  Wallet,
} from "lucide-react";

// The FinTech Color Palette for our charts
const COLORS = [
  "#89A8B2",
  "#B3C8CF",
  "#2c3e50",
  "#546e7a",
  "#E5E1DA",
  "#BF4646",
];

export function Statistics() {
  const navigate = useNavigate();

  const { data: goalsResponse, isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });
  const { data: bucketsResponse, isLoading: bucketsLoading } = useQuery({
    queryKey: ["buckets"],
    queryFn: getBuckets,
  });

  if (goalsLoading || bucketsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0E8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89A8B2]" />
      </div>
    );
  }

  const goals = goalsResponse?.data || [];
  const buckets = bucketsResponse?.data || [];

  // Global Metrics
  const activeGoalsCount = goals.filter((g) => !g.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;
  const totalNetWorth = buckets.reduce((sum, b) => sum + b.totalBalance, 0);

  // 1. Chart Data: Portfolio Distribution (Buckets)
  const bucketData = buckets
    .map((b) => ({ name: b.name, value: b.totalBalance }))
    .filter((b) => b.value > 0);

  // 2. Chart Data: Allocation by Category
  const categoryMap = goals.reduce((acc: Record<string, number>, goal) => {
    if (goal.currentValue > 0) {
      acc[goal.category] = (acc[goal.category] || 0) + goal.currentValue;
    }
    return acc;
  }, {});

  const categoryData = Object.keys(categoryMap).map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: categoryMap[key],
  }));

  return (
    <div className="min-h-screen bg-[#F1F0E8] pb-12">
      {/* Minimal Header */}
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
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-secondary h-10 px-4 text-sm bg-white/60"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </button>
        </div>
      </header>

      <div className="container mx-auto px-6 pt-10">
        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-card p-6 flex flex-col items-center text-center bg-white/40 rounded-[32px]">
            <Target className="w-8 h-8 mb-3 text-[#89A8B2]" />
            <div className="text-3xl font-extrabold text-[#2c3e50]">
              {activeGoalsCount}
            </div>
            <div className="text-[#546e7a] font-medium mt-1">Active Goals</div>
          </div>
          <div className="glass-card p-6 flex flex-col items-center text-center bg-white/40 rounded-[32px]">
            <CheckCircle2 className="w-8 h-8 mb-3 text-[#B3C8CF]" />
            <div className="text-3xl font-extrabold text-[#2c3e50]">
              {completedGoalsCount}
            </div>
            <div className="text-[#546e7a] font-medium mt-1">
              Completed Goals
            </div>
          </div>
          <div className="glass-card p-6 flex flex-col items-center text-center bg-white/40 rounded-[32px]">
            <PiggyBank className="w-8 h-8 mb-3 text-[#89A8B2]" />
            <div className="text-3xl font-extrabold text-[#2c3e50]">
              ₹{totalNetWorth.toLocaleString("en-IN")}
            </div>
            <div className="text-[#546e7a] font-medium mt-1">
              Total Tracked Wealth
            </div>
          </div>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart: Portfolio Distribution */}
          <div className="glass-card p-8 bg-white/40 rounded-[32px] flex flex-col">
            <h3 className="text-xl font-extrabold text-[#2c3e50] mb-6 text-center">
              Portfolio Distribution (Buckets)
            </h3>
            {bucketData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bucketData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {bucketData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number | undefined) =>
                        `₹${(val ?? 0).toLocaleString("en-IN")}`
                      }
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#546e7a] font-medium">
                No bucket data available.
              </div>
            )}
          </div>

          {/* Bar Chart: Allocation by Category */}
          <div className="glass-card p-8 bg-white/40 rounded-[32px] flex flex-col">
            <h3 className="text-xl font-extrabold text-[#2c3e50] mb-6 text-center">
              Allocated Funds by Category
            </h3>
            {categoryData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#546e7a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#546e7a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.4)" }}
                      formatter={(val: number | undefined) =>
                        `₹${(val ?? 0).toLocaleString("en-IN")}`
                      }
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="value" fill="#89A8B2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#546e7a] font-medium">
                No category data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
