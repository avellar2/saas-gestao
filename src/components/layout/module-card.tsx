"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import {
  Users,
  FileText,
  ClipboardList,
  Package,
  Calendar,
  ShoppingBag,
  BarChart3,
  PieChart,
  Shield,
  UtensilsCrossed,
  Lock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getModuleConfig, getModuleRoute, isActiveModule } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
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

interface ModuleCardProps {
  moduleKey: ModuleKey;
  name: string;
  description: string;
  active: boolean;
}

export function ModuleCard({ moduleKey, name, description, active }: ModuleCardProps) {
  const config = getModuleConfig(moduleKey);
  const Icon = ICON_MAP[config?.icon || ""] || Zap;
  const colorClass = config?.color || "bg-muted text-muted-foreground";
  const displayName = config?.name || name;
  const displayDesc = config?.description || description;
  const isComingSoon = config?.status === "coming_soon";

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

  if (active) {
    return (
      <Link href={getModuleRoute(moduleKey)} className="block group">
        <m.div
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
            <m.div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Icon className="w-5 h-5" />
            </m.div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{displayDesc}</p>
            </div>
            <m.div
              className="shrink-0 mt-1"
              initial={{ opacity: 0, x: -4 }}
              whileHover={{ opacity: 1, x: 0 }}
            >
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </m.div>
          </CardContent>
        </m.div>
      </Link>
    );
  }

  // Inactive module — link to upgrade (or show coming soon badge)
  return (
    <Link href={isComingSoon ? "#" : `/upgrade?module=${moduleKey}`} className="block group" onClick={isComingSoon ? (e) => e.preventDefault() : undefined}>
      <m.div
        whileTap={isComingSoon ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.1 }}
        className="h-full rounded-[1.5rem] bg-muted/40 border border-border/40 opacity-60 hover:opacity-80 transition-opacity duration-300 cursor-pointer relative"
      >
        <CardContent className="p-5 flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-muted-foreground">{displayName}</h3>
            <p className="text-sm text-muted-foreground/70 mt-0.5 leading-relaxed">{displayDesc}</p>
          </div>
          {isComingSoon ? (
            <span className="shrink-0 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              Em breve
            </span>
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1" />
          )}
        </CardContent>
      </m.div>
    </Link>
  );
}