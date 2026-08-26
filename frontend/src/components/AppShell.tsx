// frontend/src/components/AppShell.tsx
// Header, navigation and the user menu (settings + logout) shared by every page.
import { useEffect, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { logout } from "@/api";
import { useSession } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Income", icon: ArrowDownLeft },
  { to: "/expenses", label: "Expenses", icon: ArrowUpRight },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/ledger", label: "Ledger", icon: ListOrdered },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isError } = useSession();

  useEffect(() => {
    if (isError) navigate("/");
  }, [isError, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // The cookie may already be gone; either way the session ends locally.
    }
    queryClient.clear();
    toast.success("Signed out.");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-canvas pb-16">
      <header className="bg-white/40 backdrop-blur-xl border-b border-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2.5 shrink-0"
          >
            <span className="bg-brand p-2 rounded-xl text-brand-ink shadow-sm">
              <Wallet className="w-5 h-5" />
            </span>
            <span className="font-serif text-2xl text-ink-1">Goalie</span>
          </button>

          <nav className="hidden md:flex items-center gap-1 bg-white/50 rounded-full p-1 border border-white/70">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-[--motion-base]",
                    isActive
                      ? "bg-brand text-brand-ink shadow-sm"
                      : "text-ink-2 hover:bg-white hover:text-ink-1",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full bg-white/60 border border-white/70 pl-3 pr-2 py-1.5 hover:bg-white transition-colors">
                <span className="hidden sm:block text-sm font-semibold text-ink-2 max-w-[10rem] truncate">
                  {user?.name || user?.email || "Account"}
                </span>
                <span className="w-7 h-7 rounded-full bg-brand text-brand-ink grid place-items-center text-xs font-bold">
                  {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-hairline bg-white w-52">
              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 font-medium">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="gap-2 font-medium text-critical">
                <LogOut className="w-4 h-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Same destinations, horizontally scrollable, for narrow screens. */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
                  isActive ? "bg-brand text-brand-ink" : "bg-white/60 text-ink-2",
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-8">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-[--motion-slow]">
      <div>
        <h1 className="font-serif text-4xl text-ink-1">{title}</h1>
        {subtitle && <p className="text-ink-2 font-medium mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
    </div>
  );
}
