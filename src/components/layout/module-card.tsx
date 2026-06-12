import Link from "next/link";
import {
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
  Lock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ModuleKey } from "@/types";

const MODULE_ICON_MAP: Record<string, React.ElementType> = {
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

const ACTIVE_COLORS: Record<string, string> = {
  customers: "bg-blue-50 text-blue-600 ring-blue-100",
  quotes: "bg-amber-50 text-amber-600 ring-amber-100",
  service_orders: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  inventory: "bg-purple-50 text-purple-600 ring-purple-100",
  scheduling: "bg-rose-50 text-rose-600 ring-rose-100",
  catalog: "bg-cyan-50 text-cyan-600 ring-cyan-100",
  menu: "bg-orange-50 text-orange-600 ring-orange-100",
  finance: "bg-teal-50 text-teal-600 ring-teal-100",
  reports: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  users_permissions: "bg-slate-50 text-slate-600 ring-slate-100",
};

interface ModuleCardProps {
  moduleKey: ModuleKey;
  name: string;
  description: string;
  active: boolean;
}

export function ModuleCard({ moduleKey, name, description, active }: ModuleCardProps) {
  const Icon = MODULE_ICON_MAP[moduleKey] || Zap;
  const colorClass = ACTIVE_COLORS[moduleKey] || "bg-gray-50 text-gray-600";

  if (active) {
    return (
      <Link href={getRoute(moduleKey)} className="block group">
        <Card className="h-full border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 cursor-pointer group-hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-start gap-4">
            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1 ${colorClass} transition-transform group-hover:scale-110`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                {name}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/upgrade?module=${moduleKey}`} className="block group">
      <Card className="h-full border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 cursor-pointer opacity-70 hover:opacity-90">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-400 text-sm">{name}</h3>
            <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{description}</p>
          </div>
          <Lock className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
        </CardContent>
      </Card>
    </Link>
  );
}

function getRoute(key: string): string {
  const map: Record<string, string> = {
    customers: "/clientes",
    quotes: "/orcamentos",
    service_orders: "/ordens-servico",
  };
  return map[key] || "/dashboard";
}
