"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useSidebar } from "@/hooks/useSidebar";
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
  Sun,
  Moon,
  X,
} from "lucide-react";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { useTranslations } from "next-intl";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations("nav");

  const mainNav = [
    { name: t("documents"), href: "/dashboard/documents", icon: FileText },
    { name: t("compare"), href: "/dashboard/compare", icon: GitCompare },
    { name: t("calculator"), href: "/dashboard/calculator", icon: Calculator },
    { name: t("reports"), href: "/dashboard/reports", icon: FileOutput },
    { name: t("settings"), href: "/dashboard/settings", icon: Settings },
  ];

  const adminNav = [
    { name: t("agencies"), href: "/admin/agencies", icon: Building2 },
    { name: t("users"), href: "/admin/users", icon: Users },
    { name: t("activityLog"), href: "/admin/logs", icon: Activity },
  ];
  const { theme, setTheme } = useTheme();
  const { isOpen, close } = useSidebar();
  const sidebarRef = useRef<HTMLElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const isAdmin =
    user?.role === "super_admin" || user?.role === "agency_admin";

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close on Escape and focus trap for mobile
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Tab" && sidebarRef.current) {
      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      firstFocusableRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">ASKID</span>
        </div>
        {/* Mobile close button */}
        <button
          ref={firstFocusableRef}
          onClick={close}
          className="lg:hidden rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigazione principale">
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
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t("admin")}
              </p>
            </div>
            <div className="space-y-1">
              {adminNav
                .filter(
                  (item) =>
                    user?.role === "super_admin" ||
                    item.href !== "/admin/agencies"
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
                          ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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

      {/* Language + User section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Avatar"
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {user?.full_name?.charAt(0) || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Esci"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden lg:flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        aria-label="Barra laterale"
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:hidden transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Barra laterale"
        role="dialog"
        aria-modal={isOpen}
      >
        {navContent}
      </aside>
    </>
  );
}
