"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
  Building2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";

const MODULE_ICONS: Record<string, typeof Building2> = {
  customers: Users,
  quotes: FileText,
  service_orders: ClipboardList,
  inventory: Package,
  scheduling: Calendar,
  catalog: ShoppingBag,
  menu: UtensilsCrossed,
  finance: BarChart3,
  reports: PieChart,
  users_permissions: Shield,
};

const MODULE_LABELS: Record<string, string> = {
  customers: "Clientes",
  quotes: "Orçamentos",
  service_orders: "Ordens de Serviço",
  inventory: "Estoque",
  scheduling: "Agendamento",
  catalog: "Catálogo WhatsApp",
  menu: "Cardápio Digital",
  finance: "Financeiro",
  reports: "Relatórios",
  users_permissions: "Usuários",
};

const MODULE_ROUTES: Record<string, string> = {
  customers: "/clientes",
  quotes: "/orcamentos",
  service_orders: "/ordens-servico",
};

interface DashboardSidebarProps {
  user: Record<string, unknown>;
  activeModules: Set<string>;
}

export function DashboardSidebar({ user, activeModules }: DashboardSidebarProps) {
  const pathname = usePathname();
  const email = (user.email as string) || "";
  const name = (user.name as string) || "";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || email.slice(0, 2).toUpperCase();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  for (const [key, href] of Object.entries(MODULE_ROUTES)) {
    if (activeModules.has(key)) {
      navItems.push({
        key,
        label: MODULE_LABELS[key] || key,
        href,
        icon: MODULE_ICONS[key] || Building2,
      });
    }
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 fixed h-full z-40">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Gestor Local</h1>
            <p className="text-[11px] text-slate-400 leading-tight">Painel da Empresa</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? "bg-indigo-600/15 text-indigo-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }
              `}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-indigo-400" : ""}`} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <Avatar className="w-8 h-8 bg-indigo-600">
            <AvatarFallback className="text-xs font-semibold text-white bg-indigo-600">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{name || "Usuário"}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
