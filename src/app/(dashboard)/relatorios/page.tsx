import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  FileText,
  Wrench,
  DollarSign,
  Package,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

interface ReportData {
  customers: {
    total: number;
    newThisMonth: number;
  };
  quotes: {
    total: number;
    draft: number;
    sent: number;
    approved: number;
    rejected: number;
    totalValue: number;
  };
  serviceOrders: {
    total: number;
    open: number;
    inProgress: number;
    finished: number;
    delivered: number;
    cancelled: number;
    totalValue: number;
  };
  financial: {
    totalReceivable: number;
    totalPayable: number;
    balance: number;
    pending: number;
    paid: number;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
  };
  appointments: {
    total: number;
    today: number;
    scheduled: number;
  };
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  valueColor,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  valueColor?: string;
  variant?: "default" | "positive" | "negative";
}) {
  const iconClass = iconColor || "text-muted-foreground";
  const valClass = valueColor || "";

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
      <span className={`text-2xl font-bold tracking-tight ${valClass}`}>
        {value}
      </span>
      {subtitle && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

function StatusRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{count}</span>
        <span className="text-xs text-muted-foreground w-8 text-right">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
        <Icon className={`h-4 w-4 ${iconColor || "text-muted-foreground"}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "reports");
  if (!hasAccess) redirect("/upgrade?module=reports");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/relatorios`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Erro ao carregar relatorios.
      </div>
    );
  }

  const data: ReportData = await res.json();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatorios</h1>
      </div>

      {/* Clientes */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          Clientes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total de Clientes"
            value={data.customers.total}
            icon={Users}
            iconColor="text-blue-500"
          />
          <MetricCard
            title="Novos este Mes"
            value={data.customers.newThisMonth}
            subtitle="Clientes cadastrados neste mes"
            icon={TrendingUp}
            iconColor="text-emerald-500"
            valueColor="text-emerald-600"
          />
        </div>
      </section>

      {/* Orcamentos */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" />
          Orcamentos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Total de Orcamentos"
            value={data.quotes.total}
            icon={FileText}
            iconColor="text-orange-500"
          />
          <MetricCard
            title="Valor Total"
            value={formatCurrency(data.quotes.totalValue)}
            icon={DollarSign}
            iconColor="text-emerald-500"
          />
        </div>
        <SectionCard title="Por Status" icon={FileText} iconColor="text-orange-500">
          <StatusRow label="Rascunho" count={data.quotes.draft} total={data.quotes.total} />
          <StatusRow label="Enviado" count={data.quotes.sent} total={data.quotes.total} />
          <StatusRow label="Aprovado" count={data.quotes.approved} total={data.quotes.total} />
          <StatusRow label="Rejeitado" count={data.quotes.rejected} total={data.quotes.total} />
        </SectionCard>
      </section>

      {/* Ordens de Servico */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-purple-500" />
          Ordens de Servico
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Total de OS"
            value={data.serviceOrders.total}
            icon={Wrench}
            iconColor="text-purple-500"
          />
          <MetricCard
            title="Valor Total"
            value={formatCurrency(data.serviceOrders.totalValue)}
            icon={DollarSign}
            iconColor="text-emerald-500"
          />
        </div>
        <SectionCard title="Por Status" icon={Wrench} iconColor="text-purple-500">
          <StatusRow label="Aberta" count={data.serviceOrders.open} total={data.serviceOrders.total} />
          <StatusRow label="Em Andamento" count={data.serviceOrders.inProgress} total={data.serviceOrders.total} />
          <StatusRow label="Finalizada" count={data.serviceOrders.finished} total={data.serviceOrders.total} />
          <StatusRow label="Entregue" count={data.serviceOrders.delivered} total={data.serviceOrders.total} />
          <StatusRow label="Cancelada" count={data.serviceOrders.cancelled} total={data.serviceOrders.total} />
        </SectionCard>
      </section>

      {/* Financeiro */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          Financeiro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="A Receber"
            value={formatCurrency(data.financial.totalReceivable)}
            icon={TrendingUp}
            iconColor="text-emerald-500"
            valueColor="text-emerald-600"
          />
          <MetricCard
            title="A Pagar"
            value={formatCurrency(data.financial.totalPayable)}
            icon={TrendingDown}
            iconColor="text-destructive"
            valueColor="text-destructive"
          />
          <MetricCard
            title="Saldo"
            value={formatCurrency(data.financial.balance)}
            icon={DollarSign}
            iconColor={data.financial.balance >= 0 ? "text-emerald-500" : "text-destructive"}
            valueColor={data.financial.balance >= 0 ? "text-emerald-600" : "text-destructive"}
            variant={data.financial.balance >= 0 ? "positive" : "negative"}
          />
          <MetricCard
            title="Pendentes"
            value={data.financial.pending}
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
        </div>
      </section>

      {/* Estoque */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-cyan-500" />
          Estoque
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total de Produtos"
            value={data.inventory.totalProducts}
            icon={Package}
            iconColor="text-cyan-500"
          />
          <MetricCard
            title="Estoque Baixo"
            value={data.inventory.lowStock}
            subtitle="Produtos com quantidade abaixo do minimo"
            icon={AlertTriangle}
            iconColor={data.inventory.lowStock > 0 ? "text-destructive" : "text-emerald-500"}
            valueColor={data.inventory.lowStock > 0 ? "text-destructive" : "text-emerald-600"}
          />
        </div>
      </section>

      {/* Agendamentos */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          Agendamentos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total de Agendamentos"
            value={data.appointments.total}
            icon={Calendar}
            iconColor="text-indigo-500"
          />
          <MetricCard
            title="Hoje"
            value={data.appointments.today}
            subtitle="Agendamentos para hoje"
            icon={Calendar}
            iconColor="text-blue-500"
          />
          <MetricCard
            title="Agendados"
            value={data.appointments.scheduled}
            subtitle="Agendamentos com status agendado"
            icon={Calendar}
            iconColor="text-purple-500"
          />
        </div>
      </section>
    </div>
  );
}
