"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, ArrowUpFromLine, ArrowDownFromLine, TrendingUp, ListOrdered } from "lucide-react";

const TABS = [
  { href: "/financeiro", label: "Visão Geral", icon: BarChart3, exact: true },
  { href: "/financeiro/receber", label: "Contas a Receber", icon: ArrowUpFromLine, exact: false },
  { href: "/financeiro/pagar", label: "Contas a Pagar", icon: ArrowDownFromLine, exact: false },
  { href: "/financeiro/fluxo", label: "Fluxo de Caixa", icon: TrendingUp, exact: false },
  { href: "/financeiro/transacoes", label: "Transações", icon: ListOrdered, exact: false },
];

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (tab: (typeof TABS)[number]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
