"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  customers: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  quotes: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  service_orders: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
  inventory: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  scheduling: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  catalog: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400",
  menu: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  finance: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400",
  reports: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
  users_permissions: "bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400",
};

interface ModuleCardProps {
  moduleKey: ModuleKey;
  name: string;
  description: string;
  active: boolean;
}

export function ModuleCard({ moduleKey, name, description, active }: ModuleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    if (isHovered) {
      card.addEventListener("mousemove", handleMouseMove);
    }
    return () => card.removeEventListener("mousemove", handleMouseMove);
  }, [isHovered]);

  const Icon = MODULE_ICON_MAP[moduleKey] || Zap;
  const colorClass = ACTIVE_COLORS[moduleKey] || "bg-muted text-muted-foreground";

  if (active) {
    return (
      <Link href={getRoute(moduleKey)} className="block group">
        <motion.div
          ref={cardRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="h-full rounded-[1.5rem] bg-card border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 cursor-pointer relative overflow-hidden"
        >
          {/* Spotlight border on hover */}
          {isHovered && (
            <div
              className="absolute inset-0 rounded-[1.5rem] pointer-events-none"
              style={{
                background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(5,150,105,0.06), transparent 40%)`,
              }}
            />
          )}

          <CardContent className="p-5 flex items-start gap-4 relative">
            <motion.div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                {name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
            <motion.div
              className="shrink-0 mt-1"
              initial={{ opacity: 0, x: -4 }}
              whileHover={{ opacity: 1, x: 0 }}
            >
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </motion.div>
          </CardContent>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/upgrade?module=${moduleKey}`} className="block group">
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className="h-full rounded-[1.5rem] bg-muted/40 border border-border/40 opacity-60 hover:opacity-80 transition-opacity duration-300 cursor-pointer"
      >
        <CardContent className="p-5 flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-muted-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground/70 mt-0.5 leading-relaxed">{description}</p>
          </div>
          <Lock className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
        </CardContent>
      </motion.div>
    </Link>
  );
}

function getRoute(key: string): string {
  const map: Record<string, string> = {
    customers: "/clientes",
    quotes: "/orcamentos",
    service_orders: "/ordens-servico",
    inventory: "/estoque",
    scheduling: "/agendamento",
    catalog: "/catalogo",
    menu: "/cardapio",
    finance: "/financeiro",
    reports: "/relatorios",
    users_permissions: "/usuarios",
  };
  return map[key] || "/dashboard";
}
