import { useMemo } from "react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Goal } from "@/api/goals";
import { AlertCircle } from "lucide-react";

interface GoalChartProps {
  goal: Goal;
}

export function GoalChart({ goal }: GoalChartProps) {
  // The Math Engine: Convert individual transactions into a running balance timeline
  const chartData = useMemo(() => {
    if (!goal.contributions || goal.contributions.length === 0) return [];

    // Sort contributions chronologically (oldest first)
    const sorted = [...goal.contributions].sort(
      (a, b) =>
        new Date(a.timestamp || 0).getTime() -
        new Date(b.timestamp || 0).getTime(),
    );

    let runningBalance = 0;
    const data = sorted.map((entry, index) => {
      if (entry.type === "deposit") {
        runningBalance += entry.amount;
      } else if (entry.type === "withdrawal") {
        runningBalance -= entry.amount;
      }

      const dateObj = entry.timestamp ? new Date(entry.timestamp) : new Date();

      return {
        // A truly unique key prevents Recharts from merging same-day transactions
        uniqueKey: `${format(dateObj, "MMM dd")}_${index}`,
        // Precise time string for the Tooltip display
        fullDate: format(dateObj, "MMM dd"),
        balance: runningBalance,
        amount: entry.amount,
        type: entry.type,
      };
    });

    // Add an initial "zero" point so the graph always starts from the bottom
    return [
      {
        uniqueKey: "Start_start",
        fullDate: "Start",
        balance: 0,
        amount: 0,
        type: "start",
      },
      ...data,
    ];
  }, [goal.contributions]);

  if (chartData.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#546e7a]">
        <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
        <p className="font-medium text-lg">No progress data yet</p>
        <p className="text-sm opacity-70 mt-1">
          Make your first contribution to see your chart!
        </p>
      </div>
    );
  }

  // Custom Glassmorphism Tooltip for the Apple aesthetic
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-md border border-white/60 p-4 rounded-2xl shadow-lg">
          <p className="font-bold text-[#546e7a] mb-2">{data.fullDate}</p>
          <p
            className="text-2xl font-extrabold"
            style={{ color: goal.colour || "#89A8B2" }}
          >
            ₹{data.balance.toLocaleString("en-IN")}
          </p>
          {data.type !== "start" && (
            <p
              className={`text-sm font-bold mt-1 ${data.type === "deposit" ? "text-green-600" : "text-[#BF4646]"}`}
            >
              {data.type === "deposit" ? "+" : "-"} ₹
              {data.amount.toLocaleString("en-IN")}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={goal.colour || "#89A8B2"}
                stopOpacity={0.4}
              />
              <stop
                offset="95%"
                stopColor={goal.colour || "#89A8B2"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E5E1DA"
            opacity={0.5}
          />
          <XAxis
            dataKey="uniqueKey"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#878f99", fontSize: 12, fontWeight: 500 }}
            /* Slices the unique ID off the end, leaving just "Feb 26" for the visual axis */
            tickFormatter={(val) => val.split("_")[0]}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#878f99", fontSize: 12, fontWeight: 500 }}
            tickFormatter={(value) => `₹${value.toLocaleString("en-IN")}`}
            dx={-10}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "#89A8B2",
              strokeWidth: 2,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={goal.colour || "#89A8B2"}
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
