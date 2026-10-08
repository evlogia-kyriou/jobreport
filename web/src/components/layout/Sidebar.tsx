import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart2,
  Bell,
  CalendarClock,
  ChevronLeft,
  Code2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  Users2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  // ── All roles ──────────────────────────────────────────────────────────────
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "admin_technician", "admin_sales", "manager", "developer"],
  },
  // ── admin_technician + admin ───────────────────────────────────────────────
  {
    label: "Proyek",
    to: "/projects",
    icon: FolderKanban,
    roles: ["admin", "admin_technician", "admin_sales"],
  },
  {
    label: "Teknisi",
    to: "/technicians",
    icon: Users,
    roles: ["admin", "admin_technician", "admin_sales"],
  },
  // ── admin_sales + admin ────────────────────────────────────────────────────
  {
    label: "Booking",
    to: "/projects/bookings",
    icon: CalendarClock,
    roles: ["admin", "admin_sales"],
  },
  {
    label: "Pelanggan",
    to: "/customers",
    icon: Users2,
    roles: ["admin", "admin_sales"],
  },
  {
    label: "Reminder",
    to: "/reminders",
    icon: Bell,
    roles: ["admin", "admin_sales"],
  },
  {
    label: "Laporan",
    to: "/reports",
    icon: FileText,
    roles: ["admin", "admin_sales"],
  },
  // ── manager only ──────────────────────────────────────────────────────────
  {
    label: "Analitik BI",
    to: "/laporan",
    icon: TrendingUp,
    roles: ["manager"],
  },
  // ── developer only ────────────────────────────────────────────────────────
  {
    label: "Analitik",
    to: "/analytics",
    icon: BarChart2,
    permission: "view_analytics",
    roles: ["developer"],
  },
  // ── admin + manager + developer ───────────────────────────────────────────
  {
    label: "Pengaturan",
    to: "/settings",
    icon: Settings,
    roles: ["admin", "manager", "developer"],
  },
  {
    label: "Pengguna",
    to: "/users",
    icon: Code2,
    permission: "manage_users",
    roles: ["manager", "developer"],
  },
];

export function Sidebar() {
  const { user, hasPermission } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles.includes(user?.role ?? "")) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "bg-white border-r border-slate-200 flex flex-col",
        "flex-shrink-0 transition-all duration-200 relative",
        collapsed ? "w-16" : "w-60", // ← 240px ✅ (was w-56 = 224px)
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-slate-200 px-5",
          collapsed && "justify-center px-0",
        )}
      >
        {collapsed ? (
          <span className="text-lg font-bold text-blue-600">JR</span>
        ) : (
          <span className="font-bold text-blue-600 text-base tracking-tight">
            JobReport
          </span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6",
          "bg-white border border-slate-200 rounded-full",
          "flex items-center justify-center z-10",
          "hover:bg-slate-50 transition-colors",
        )}
      >
        <ChevronLeft
          className={cn(
            "w-3 h-3 text-slate-400 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          // Longest matching nav item wins — prevents "/projects"
          // lighting up when on "/projects/bookings" ✅
          const isActive =
            currentPath === item.to ||
            (currentPath.startsWith(item.to + "/") &&
              !navItems.some(
                (other) =>
                  other.to !== item.to &&
                  other.to.length > item.to.length &&
                  (currentPath === other.to ||
                    currentPath.startsWith(other.to + "/")),
              ));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "text-sm transition-colors duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {isActive && !collapsed && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      {!collapsed && user && (
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
