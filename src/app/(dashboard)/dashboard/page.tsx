import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma, tenantPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ModuleCard } from "@/components/layout/module-card";
import { MODULES } from "@/lib/modules";
import type { ModuleKey } from "@/lib/modules";
import {
  Users,
  FileText,
  ClipboardList,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MotionContainer, MotionItem } from "@/components/ui/motion-container";
import { motion } from "framer-motion";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as Record<string, unknown>).role as string;
  if (role === "SUPER_ADMIN") redirect("/admin");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const tenant = tenantPrisma(companyId);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true, trialEndsAt: true, name: true },
  });

  const companyModules = await prisma.companyModule.findMany({
    where: { companyId },
    select: { moduleKey: true, active: true },
  });

  const activeModuleMap = new Map(companyModules.map((m) => [m.moduleKey, m.active]));

  const [customerCount, pendingQuotes, openServiceOrders] = await Promise.all([
    tenant.customer.count(),
    tenant.quote.count({ where: { status: "DRAFT" } }),
    tenant.serviceOrder.count({
      where: { status: { in: ["RECEIVED", "DIAGNOSIS", "IN_PROGRESS", "WAITING_APPROVAL", "WAITING_PARTS"] } },
    }),
  ]);

  const isTrial = company?.status === "TRIAL";
  const trialEndsAt = company?.trialEndsAt;
  const isTrialExpired = isTrial && trialEndsAt && new Date() > new Date(trialEndsAt);

  return (
    <div className="space-y-8">
      {/* Header */}
      <MotionContainer className="flex items-center justify-between">
        <MotionItem>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Bem-vindo de volta, {company?.name}</p>
        </MotionItem>
        {isTrial && (
          <MotionItem>
            <Badge
              variant="secondary"
              className={`${isTrialExpired ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} font-medium px-3 py-1 border`}
            >
              {isTrialExpired ? "Trial Expirado" : "Trial Ativo"}
            </Badge>
          </MotionItem>
        )}
      </MotionContainer>

      {/* Trial Alert */}
      {isTrial && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 100, damping: 20, delay: 0.1 }}
          className={`rounded-2xl p-4 text-sm flex items-start gap-3 border ${
            isTrialExpired
              ? "bg-destructive/5 text-destructive border-destructive/15"
              : "bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/15"
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {isTrialExpired
                ? "Seu periodo de teste expirou"
                : "Voce esta no periodo de teste"}
            </p>
            <p className="mt-0.5 opacity-80">
              {isTrialExpired
                ? "Contate o administrador para ativar sua conta."
                : trialEndsAt &&
                  `Expira em ${new Date(trialEndsAt).toLocaleDateString("pt-BR")}. Contate o administrador para ativar modulos adicionais.`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Metrics - Bento Grid */}
      <MotionContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Clientes"
          value={customerCount}
          icon={Users}
          trend="+12%"
          trendUp={true}
          color="emerald"
          delay={0}
        />
        <MetricCard
          title="Orcamentos Pendentes"
          value={pendingQuotes}
          icon={FileText}
          trend="3 novos"
          trendUp={true}
          color="cyan"
          delay={0.05}
        />
        <MetricCard
          title="OS Abertas"
          value={openServiceOrders}
          icon={ClipboardList}
          trend="2 urgentes"
          trendUp={false}
          color="amber"
          delay={0.1}
        />
      </MotionContainer>

      {/* Modules */}
      <div>
        <MotionContainer className="flex items-center gap-2 mb-4">
          <MotionItem>
            <TrendingUp className="w-5 h-5 text-foreground/70" />
          </MotionItem>
          <MotionItem>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Modulos</h2>
          </MotionItem>
        </MotionContainer>

        <MotionContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.filter(m => m.status !== "legacy").map((mod, index) => {
            const isActive = activeModuleMap.get(mod.key) ?? false;
            return (
              <MotionItem key={mod.key} delay={index * 0.03}>
                <ModuleCard
                  moduleKey={mod.key as ModuleKey}
                  name={mod.name}
                  description={mod.description}
                  active={isActive}
                />
              </MotionItem>
            );
          })}
        </MotionContainer>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
  delay = 0,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  color: "emerald" | "cyan" | "amber";
  delay?: number;
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendUp
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <MotionItem delay={delay}>
      <div className="rounded-[1.5rem] bg-card border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 p-5 group">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                <AnimatedCounter value={value} />
              </span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color]} transition-transform duration-200 group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`text-xs font-semibold ${trendColor}`}>{trend}</span>
          <span className="text-xs text-muted-foreground/60 ml-1">este mes</span>
        </div>
      </div>
    </MotionItem>
  );
}
