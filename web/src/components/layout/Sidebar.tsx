import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Snowflake,
  Users,
  Users2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Pelanggan",
    to: "/customers",
    icon: Users2,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Unit AC",
    to: "/ac-units",
    icon: Snowflake,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Proyek",
    to: "/projects",
    icon: FolderKanban,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Teknisi",
    to: "/technicians",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Laporan",
    to: "/reports",
    icon: FileText,
    roles: ["admin", "supervisor"],
  },
  {
    label: "Pengaturan",
    to: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user?.role ?? ""),
  );

  return (
    <aside
      className={cn(
        "bg-white border-r border-slate-200 flex flex-col",
        "flex-shrink-0 transition-all duration-200 relative",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-slate-200 px-4",
          collapsed && "justify-center",
        )}
      >
        {collapsed ? (
          <span className="text-lg font-bold text-blue-600">JR</span>
        ) : (
          <span className="font-bold text-blue-600 text-base">JobReport</span>
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
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "text-sm transition-colors duration-150 relative",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
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
