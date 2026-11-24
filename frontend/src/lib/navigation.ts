import {
  ArrowDownLeft, ArrowUpRight, BarChart3, LayoutDashboard, ListOrdered, Settings, Target,
} from "lucide-react";

export const PRIMARY_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Income", icon: ArrowDownLeft },
  { to: "/expenses", label: "Expenses", icon: ArrowUpRight },
];

export const MORE_NAV = [
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/ledger", label: "Ledger", icon: ListOrdered },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const DESKTOP_NAV = [...PRIMARY_NAV, ...MORE_NAV.slice(0, -1)];
