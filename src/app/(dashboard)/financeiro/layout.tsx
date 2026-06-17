"use client";

import { SectionTabs } from "@/components/layout/section-tabs";
import {
  BarChart3,
  ArrowUpFromLine,
  ArrowDownFromLine,
  TrendingUp,
  ListOrdered,
} from "lucide-react";

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
  return (
    <div className="space-y-5">
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
