import { auth } from "@/lib/auth";
import { prisma, tenantPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleCard } from "@/components/layout/module-card";
import { MODULE_KEYS } from "@/types";
import type { ModuleKey } from "@/types";

const MODULE_INFO: Record<string, { name: string; description: string }> = {
  customers: { name: "Clientes", description: "Gerencie sua base de clientes" },
  quotes: {
    name: "Orçamentos",
    description: "Crie e envie orçamentos profissionais",
  },
  service_orders: {
    name: "Ordem de Serviço",
    description: "Controle suas ordens de serviço",
  },
  inventory: {
    name: "Estoque",
    description: "Controle de estoque e produtos",
  },
  scheduling: {
    name: "Agendamento",
    description: "Agenda de compromissos",
  },
  catalog: {
    name: "Catálogo WhatsApp",
    description: "Catálogo de produtos no WhatsApp",
  },
  menu: {
    name: "Cardápio Digital",
    description: "Cardápio digital para restaurantes",
  },
  finance: {
    name: "Financeiro",
    description: "Controle financeiro simples",
  },
  reports: {
    name: "Relatórios",
    description: "Relatórios gerenciais",
  },
  users_permissions: {
    name: "Usuários e Permissões",
    description: "Gerencie acessos ao sistema",
  },
};

export default async function DashboardPage() {
  const session = await auth();

  const companyId = (session?.user as Record<string, unknown>)?.companyId as string;
  const companyStatus = (session?.user as Record<string, unknown>)?.companyStatus as string;
  const tenant = tenantPrisma(companyId);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      status: true,
      trialEndsAt: true,
    },
  });

  const companyModules = await prisma.companyModule.findMany({
    where: { companyId },
    select: { moduleKey: true, active: true },
  });

  const activeModuleMap = new Map(
    companyModules.map((m) => [m.moduleKey, m.active])
  );

  const [customerCount, pendingQuotes, openServiceOrders] = await Promise.all([
    tenant.customer.count(),
    tenant.quote.count({ where: { status: "DRAFT" } }),
    tenant.serviceOrder.count({
      where: { status: { in: ["OPENED", "IN_PROGRESS", "WAITING_PARTS"] } },
    }),
  ]);

  const isTrial = company?.status === "TRIAL";
  const trialEndsAt = company?.trialEndsAt;
  const isTrialExpired =
    isTrial && trialEndsAt && new Date() > new Date(trialEndsAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {isTrial && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            TRIAL
          </Badge>
        )}
      </div>

      {isTrial && (
        <div
          className={`rounded-lg p-4 text-sm ${
            isTrialExpired
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {isTrialExpired ? (
            <p>
              Seu período de teste expirou. Contate o administrador para ativar
              sua conta.
            </p>
          ) : (
            <p>
              Você está no período de teste.{" "}
              {trialEndsAt &&
                `Expira em ${new Date(trialEndsAt).toLocaleDateString("pt-BR")}.`}{" "}
              Contate o administrador para ativar módulos adicionais.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Clientes</p>
            <p className="text-3xl font-bold mt-1">{customerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Orçamentos Pendentes
            </p>
            <p className="text-3xl font-bold mt-1">{pendingQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">OS Abertas</p>
            <p className="text-3xl font-bold mt-1">{openServiceOrders}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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