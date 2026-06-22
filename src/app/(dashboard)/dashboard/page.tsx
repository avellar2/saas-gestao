import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  CheckCircle2,
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
    select: {
      status: true,
      trialEndsAt: true,
      name: true,
      monthlyPrice: true,
      subscription: { select: { status: true, currentPeriodEndsAt: true } },
    },
  });

  const companyModules = await prisma.companyModule.findMany({
    where: { companyId },
    select: { moduleKey: true, active: true },
  });

  const activeModuleMap = new Map(companyModules.map((m) => [m.moduleKey, m.active]));

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [customerCount, pendingQuotes, openServiceOrders, newCustomersThisMonth, newQuotesThisMonth, urgentServiceOrders, approvedQuotesThisMonth] = await Promise.all([
    tenant.customer.count(),
    tenant.quote.count({ where: { status: "DRAFT" } }),
    tenant.serviceOrder.count({
      where: { status: { in: ["RECEIVED", "DIAGNOSIS", "IN_PROGRESS", "WAITING_APPROVAL", "WAITING_PARTS"] } },
    }),
    tenant.customer.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    tenant.quote.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    tenant.serviceOrder.count({
      where: {
        status: { in: ["RECEIVED", "DIAGNOSIS", "IN_PROGRESS", "WAITING_APPROVAL", "WAITING_PARTS"] },
        priority: "HIGH",
      },
    }),
    tenant.quote.count({
      where: { status: "APPROVED", approvedAt: { gte: startOfMonth } },
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
        {isTrial ? (
          <Badge
            variant="secondary"
            className={`${isTrialExpired ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"} font-medium px-3 py-1 border`}
          >
            {isTrialExpired ? "Trial Expirado" : "Trial Ativo"}
          </Badge>
        ) : company?.subscription?.currentPeriodEndsAt ? (
          (() => {
            const daysLeft = Math.ceil((new Date(company.subscription!.currentPeriodEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isSuspended = company.subscription?.status === "SUSPENDED";
            return (
              <Badge
                variant="secondary"
                className={`font-medium px-3 py-1 border ${
                  isSuspended || daysLeft <= 0
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : daysLeft <= 7
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                }`}
              >
                {isSuspended ? "Suspenso" : daysLeft <= 0 ? "Vencido" : `${daysLeft} dias restantes`}
              </Badge>
            );
          })()
        ) : null}
      </div>

      {/* Subscription Alert */}
      {!isTrial && company?.subscription && (
        (() => {
          const sub = company.subscription;
          const daysLeft = sub.currentPeriodEndsAt
            ? Math.ceil((new Date(sub.currentPeriodEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;
          const isSuspended = sub.status === "SUSPENDED";
          const isCancelled = sub.status === "CANCELLED";
          const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;

          if (isSuspended || isCancelled) {
            return (
              <div className="rounded-2xl p-4 text-sm flex items-start gap-3 border bg-destructive/5 text-destructive border-destructive/15">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {isSuspended ? "Pagamento pendente" : "Assinatura cancelada"}
                  </p>
                  <p className="mt-0.5 opacity-80">
                    {isSuspended
                      ? "Seu pagamento esta pendente. Acesse o upgrade para regularizar."
                      : "Sua assinatura foi cancelada. Acesse o upgrade para reativar."}
                  </p>
                </div>
              </div>
            );
          }

          if (isExpiringSoon) {
            return (
              <div className="rounded-2xl p-4 text-sm flex items-start gap-3 border bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/15">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Assinatura proxima do vencimento</p>
                  <p className="mt-0.5 opacity-80">
                    {daysLeft === 1
                      ? "Sua assinatura vence amanha. O pagamento sera renovado automaticamente."
                      : `Sua assinatura vence em ${daysLeft} dias. O pagamento sera renovado automaticamente.`}
                  </p>
                </div>
              </div>
            );
          }

          return null;
        })()
      )}

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

      {/* Subscription Summary */}
      {!isTrial && company?.subscription && company.monthlyPrice && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Plano Atual</p>
                <p className="text-lg font-bold">
                  R$ {Number(company.monthlyPrice).toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/mês</span>
                </p>
              </div>
            </div>
            {company.subscription.currentPeriodEndsAt && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium">Próxima cobrança</p>
                <p className="text-sm font-semibold">
                  {new Date(company.subscription.currentPeriodEndsAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
            <Link
              href="/upgrade"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Gerenciar assinatura →
            </Link>
          </div>
        </div>
      )}

      {/* Metrics - Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clientes"
          value={customerCount}
          icon={Users}
          trend={newCustomersThisMonth > 0 ? `${newCustomersThisMonth} novos` : "Sem novos"}
          trendUp={newCustomersThisMonth > 0}
          color="emerald"
          href="/clientes"
        />
        <MetricCard
          title="Orcamentos Pendentes"
          value={pendingQuotes}
          icon={FileText}
          trend={newQuotesThisMonth > 0 ? `${newQuotesThisMonth} novos` : "Sem novos"}
          trendUp={newQuotesThisMonth > 0}
          color="cyan"
          href="/orcamentos"
        />
        <MetricCard
          title="Orcamentos Aprovados"
          value={approvedQuotesThisMonth}
          icon={CheckCircle2}
          trend={approvedQuotesThisMonth > 0 ? `${approvedQuotesThisMonth} este mes` : "Nenhum este mes"}
          trendUp={approvedQuotesThisMonth > 0}
          color="violet"
          href="/orcamentos"
        />
        <MetricCard
          title="OS Abertas"
          value={openServiceOrders}
          icon={ClipboardList}
          trend={urgentServiceOrders > 0 ? `${urgentServiceOrders} urgentes` : "Sem urgentes"}
          trendUp={false}
          color="amber"
          href="/ordens-servico"
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
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  color: "emerald" | "cyan" | "amber" | "violet";
  href: string;
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };

  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendUp
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <Link
      href={href}
      className="rounded-[1.5rem] bg-card border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-primary/20 transition-all duration-300 p-5 group block cursor-pointer"
    >
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
    </Link>
  );
}