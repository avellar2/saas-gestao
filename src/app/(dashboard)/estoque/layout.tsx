"use client";

import { SectionTabs } from "@/components/layout/section-tabs";
import { LayoutDashboard, Package, ArrowLeftRight } from "lucide-react";

const TABS = [
  { href: "/estoque", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/estoque/produtos", label: "Produtos", icon: Package, exact: false },
  { href: "/estoque/movimentacoes", label: "Movimentações", icon: ArrowLeftRight, exact: false },
];

export default function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
