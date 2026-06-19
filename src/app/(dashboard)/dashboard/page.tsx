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
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Bem-vindo de volta, {company?.name}</p>
        </div>
        {isTrial && (
          <Badge
            variant="secondary"
            className={`${isTrialExpired ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} font-medium px-3 py-1 border`}
          >
            {isTrialExpired ? "Trial Expirado" : "Trial Ativo"}
          </Badge>
        )}
      </div>

      {/* Trial Alert */}
      {isTrial && (
        <div
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
        </div>
      )}

      {/* Metrics - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Clientes"
          value={customerCount}
          icon={Users}
          trend="+12%"
          trendUp={true}
          color="emerald"
        />
        <MetricCard
          title="Orcamentos Pendentes"
          value={pendingQuotes}
          icon={FileText}
          trend="3 novos"
          trendUp={true}
          color="cyan"
        />
        <MetricCard
          title="OS Abertas"
          value={openServiceOrders}
          icon={ClipboardList}
          trend="2 urgentes"
          trendUp={false}
          color="amber"
        />
      </div>

      {/* Modules */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-foreground/70" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Modulos</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.filter(m => m.status !== "legacy").map((mod) => {
            const isActive = activeModuleMap.get(mod.key) ?? false;
            return (
              <ModuleCard
                key={mod.key}
                moduleKey={mod.key as ModuleKey}
                name={mod.name}
                description={mod.description}
                active={isActive}
              />
            );
          })}
        </div>
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
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  color: "emerald" | "cyan" | "amber";
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
    <div className="rounded-[1.5rem] bg-card border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 p-5 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
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
  );
}