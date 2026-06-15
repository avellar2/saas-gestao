"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Package,
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  PieChart,
  Shield,
  History,
  LogOut,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MODULES, isActiveModule } from "@/lib/modules";
import type { LucideIcon } from "lucide-react";

// Mapa de ícones — a única duplicação necessária (React precisa de componentes)
const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  FileText,
  ClipboardList,
  Package,
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  PieChart,
  Shield,
};

interface DashboardSidebarProps {
  user: Record<string, unknown>;
  activeModules: Set<string>;
}

export function DashboardSidebar({ user, activeModules }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const email = (user.email as string) || "";
  const name = (user.name as string) || "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || email.slice(0, 2).toUpperCase();

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "atividades", label: "Atividades", href: "/atividades", icon: History },
  ];

  for (const mod of MODULES) {
    if (activeModules.has(mod.key) && isActiveModule(mod.key)) {
      navItems.push({
        key: mod.key,
        label: mod.name,
        href: mod.routes[0],
        icon: ICON_MAP[mod.icon] || Building2,
      });
    }
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <motion.div
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0"
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-sm font-bold text-sidebar-foreground leading-tight tracking-tight">Gestor Local</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href}>
              <motion.div
                initial={false}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-160 ease-out
                  ${active
                    ? "text-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }
                `}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 relative z-10 ${active ? "text-primary" : ""}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      className="relative z-10 overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !collapsed && (
                  <motion.div
                    layoutId="activeDot"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary relative z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <Avatar className="w-8 h-8 bg-primary shrink-0">
            <AvatarFallback className="text-xs font-semibold text-primary-foreground bg-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">{name || "Usuario"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-160"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3.5 left-4 z-50 lg:hidden w-9 h-9 rounded-xl bg-sidebar text-sidebar-foreground flex items-center justify-center shadow-lg"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-[100dvh] bg-sidebar text-sidebar-foreground flex flex-col shrink-0
          border-r border-sidebar-border
          ${collapsed ? "w-20" : "w-64"}
        `}
        initial={false}
        animate={{
          x: mobileOpen ? 0 : 0,
          width: collapsed ? 80 : 256,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          width: collapsed ? 80 : 256,
        }}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
