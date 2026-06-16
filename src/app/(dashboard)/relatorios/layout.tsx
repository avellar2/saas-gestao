"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  UtensilsCrossed,
  Package,
  Users,
} from "lucide-react";

interface TabConfig {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: string;
  exact: boolean;
}

const ALL_TABS: TabConfig[] = [
  { href: "/relatorios/executivo", label: "Executivo", icon: LayoutDashboard, moduleKey: "reports", exact: true },
  { href: "/relatorios/financeiro", label: "Financeiro", icon: DollarSign, moduleKey: "finance", exact: false },
  { href: "/relatorios/os", label: "Ordens de Serviço", icon: Wrench, moduleKey: "service_orders", exact: false },
  { href: "/relatorios/cardapio", label: "Cardápio", icon: UtensilsCrossed, moduleKey: "menu", exact: false },
  { href: "/relatorios/estoque", label: "Estoque", icon: Package, moduleKey: "inventory", exact: false },
  { href: "/relatorios/clientes", label: "Clientes", icon: Users, moduleKey: "customers", exact: false },
];

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeModules, setActiveModules] = useState<Set<string> | null>(null);
  const [month, setMonth] = useState(() => {
    const sp = searchParams.get("month");
    if (sp) return sp;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetch("/api/relatorios/modules-ativos")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.activeModules) {
          setActiveModules(new Set(data.activeModules));
        }
      })
      .catch(() => setActiveModules(new Set()));
  }, []);

  // Filtrar abas com base nos módulos ativos
  const visibleTabs = activeModules
    ? ALL_TABS.filter((tab) => activeModules.has(tab.moduleKey))
    : ALL_TABS; // Enquanto carrega, mostra todas

  function handleMonthChange(newMonth: string) {
    setMonth(newMonth);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Header com filtro de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring w-48"
        />
      </div>

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b pb-1">
        {visibleTabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={`${tab.href}?month=${month}`}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div>{children}</div>
    </div>
  );
}
