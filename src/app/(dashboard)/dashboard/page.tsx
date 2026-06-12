import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma, tenantPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleCard } from "@/components/layout/module-card";
import { MODULE_KEYS } from "@/types";
import type { ModuleKey } from "@/types";
import {
  Users,
  FileText,
  ClipboardList,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";

const MODULE_INFO: Record<
  string,
  { name: string; description: string; icon: string }
> = {
  customers: { name: "Clientes", description: "Gerencie sua base de clientes", icon: "Users" },
  quotes: { name: "Orçamentos", description: "Crie e envie orçamentos profissionais", icon: "FileText" },
  service_orders: { name: "Ordem de Serviço", description: "Controle suas ordens de serviço", icon: "ClipboardList" },
  inventory: { name: "Estoque", description: "Controle de estoque e produtos", icon: "Package" },
  scheduling: { name: "Agendamento", description: "Agenda de compromissos", icon: "Calendar" },
  catalog: { name: "Catálogo WhatsApp", description: "Catálogo de produtos no WhatsApp", icon: "ShoppingBag" },
  menu: { name: "Cardápio Digital", description: "Cardápio digital para restaurantes", icon: "UtensilsCrossed" },
  finance: { name: "Financeiro", description: "Controle financeiro simples", icon: "BarChart3" },
  reports: { name: "Relatórios", description: "Relatórios gerenciais", icon: "PieChart" },
  users_permissions: { name: "Usuários e Permissões", description: "Gerencie acessos ao sistema", icon: "Shield" },
};

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
      where: { status: { in: ["OPENED", "IN_PROGRESS", "WAITING_PARTS"] } },
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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-0.5">Bem-vindo de volta, {company?.name}</p>
        </div>
        {isTrial && (
          <Badge
            variant="secondary"
            className={`${isTrialExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"} font-medium px-3 py-1`}
          >
            {isTrialExpired ? "Trial Expirado" : "Trial Ativo"}
          </Badge>
        )}
      </div>

      {/* Trial Alert */}
      {isTrial && (
        <div
          className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
            isTrialExpired
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isTrialExpired
                ? "Seu período de teste expirou"
                : "Você está no período de teste"}
            </p>
            <p className="mt-0.5 opacity-80">
              {isTrialExpired
                ? "Contate o administrador para ativar sua conta."
                : trialEndsAt &&
                  `Expira em ${new Date(trialEndsAt).toLocaleDateString("pt-BR")}. Contate o administrador para ativar módulos adicionais.`}
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Clientes"
          value={customerCount}
          icon={Users}
          trend="+12%"
          trendUp={true}
          color="indigo"
        />
        <MetricCard
          title="Orçamentos Pendentes"
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
          color="emerald"
        />
      </div>

      {/* Modules */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-800">Módulos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULE_KEYS.map((key) => {
            const info = MODULE_INFO[key];
            const isActive = activeModuleMap.get(key) ?? false;
            return (
              <ModuleCard
                key={key}
                moduleKey={key as ModuleKey}
                name={info.name}
                description={info.description}
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
  color: "indigo" | "cyan" | "emerald";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp className={`w-3.5 h-3.5 ${trendUp ? "text-emerald-500" : "text-amber-500 rotate-180"}`} />
          <span className={`text-xs font-medium ${trendUp ? "text-emerald-600" : "text-amber-600"}`}>
            {trend}
          </span>
          <span className="text-xs text-slate-400 ml-1">este mês</span>
        </div>
      </CardContent>
    </Card>
  );
}
