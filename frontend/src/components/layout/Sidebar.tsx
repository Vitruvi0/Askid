"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText,
  GitCompare,
  Calculator,
  FileOutput,
  Settings,
  Shield,
  LogOut,
  Users,
  Building2,
  Activity,
  LayoutDashboard,
} from "lucide-react";

const mainNav = [
  { name: "Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Compare", href: "/dashboard/compare", icon: GitCompare },
  { name: "Calculator", href: "/dashboard/calculator", icon: Calculator },
  { name: "Reports", href: "/dashboard/reports", icon: FileOutput },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNav = [
  { name: "Agencies", href: "/admin/agencies", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Audit Logs", href: "/admin/logs", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin =
    user?.role === "super_admin" || user?.role === "agency_admin";

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">ASKID</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <div className="mt-6 mb-2 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Admin
              </p>
            </div>
            <div className="space-y-1">
              {adminNav
                .filter(
                  (item) =>
                    user?.role === "super_admin" ||
                    item.name !== "Agencies"
                )
                .map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-600"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600">
            {user?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
