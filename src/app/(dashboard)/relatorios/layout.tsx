"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SectionTabs } from "@/components/layout/section-tabs";
import type { TabConfig } from "@/components/layout/section-tabs";
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  UtensilsCrossed,
  Package,
  Users,
} from "lucide-react";

interface ExtendedTabConfig extends TabConfig {
  moduleKey: string;
}

const ALL_TABS: ExtendedTabConfig[] = [
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

  // Adicionar query string month às URLs
  const tabsWithMonth = visibleTabs.map((tab) => ({
    ...tab,
    href: `${tab.href}?month=${month}`,
  }));

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

      {/* Abas - usando SectionTabs */}
      <SectionTabs tabs={tabsWithMonth} />

      {/* Conteúdo */}
      <div>{children}</div>
    </div>
  );
}
