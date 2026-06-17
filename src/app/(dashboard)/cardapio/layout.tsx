"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed, QrCode, ChefHat, ClipboardList, DollarSign, Settings } from "lucide-react";

const TABS = [
  { href: "/cardapio", label: "Itens do Cardápio", icon: UtensilsCrossed, exact: true },
  { href: "/cardapio/mesas", label: "Mesas / QR Code", icon: QrCode, exact: false },
  { href: "/cardapio/cozinha", label: "Cozinha", icon: ChefHat, exact: false },
  { href: "/cardapio/pedidos", label: "Pedidos", icon: ClipboardList, exact: false },
  { href: "/cardapio/caixa", label: "Caixa", icon: DollarSign, exact: false },
  { href: "/cardapio/config", label: "Configurar", icon: Settings, exact: false },
];

export default function CardapioLayout({
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
    <div className="space-y-5">
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
