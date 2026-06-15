import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import { ServiceOrderStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";
import {
  getStatusLabel, getStatusVariant,
  getPriorityLabel, getPriorityVariant,
  getPaymentStatusLabel, getPaymentStatusVariant,
} from "@/lib/os-status";

interface SearchParams {
  status?: string;
  sort?: string;
}

const STATUS_TABS = [
  { label: "Todas", value: "" },
  { label: "Recebida", value: "RECEIVED" },
  { label: "Em Diagnóstico", value: "DIAGNOSIS" },
  { label: "Aguardando Peças", value: "WAITING_PARTS" },
  { label: "Em Execução", value: "IN_PROGRESS" },
  { label: "Pronta", value: "READY" },
  { label: "Entregue", value: "DELIVERED" },
  { label: "Cancelada", value: "CANCELLED" },
];

export default async function OrdensServicoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "service_orders");
  if (!hasAccess) redirect("/upgrade?module=service_orders");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const statusFilter = params.status || "";
  const sort = params.sort || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (
    statusFilter &&
    Object.values(ServiceOrderStatus).includes(
      statusFilter as ServiceOrderStatus
    )
  ) {
    where.status = statusFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const serviceOrders = await tenant.serviceOrder.findMany({
    where,
    orderBy,
    include: {
      customer: {
        select: { id: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ordens de Servico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie ordens de servico</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=service_orders" download>
            <Button variant="outline" className="rounded-xl">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/ordens-servico/novo">
            <Button className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value
                  ? `/ordens-servico?status=${tab.value}`
                  : "/ordens-servico"
              }
            >
              <Button
                variant={statusFilter === tab.value ? "default" : "outline"}
                size="sm"
                className="rounded-lg"
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
        <SortSelect
          options={[
            { value: "createdAt_desc", label: "Mais recentes" },
            { value: "total_desc", label: "Maior valor" },
            { value: "total_asc", label: "Menor valor" },
          ]}
          defaultValue={sort}
        />
      </div>

      {serviceOrders.length === 0 ? (
        <EmptyState
          title={statusFilter ? "Nenhum resultado" : "Nenhuma ordem cadastrada"}
          description={
            statusFilter
              ? "Nenhuma ordem encontrada com esse status."
              : "Crie sua primeira ordem de servico."
          }
          icon={ClipboardList}
          actionLabel="Nova OS"
          actionHref="/ordens-servico/novo"
        />
      ) : (
        <div className="rounded-[1.25rem] border border-border/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.map((so) => (
                  <TableRow key={so.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium">{so.code || `#${so.number}`}</TableCell>
                    <TableCell>{so.customer.name}</TableCell>
                    <TableCell>
                      {so.equipmentName ? (
                        <span className="text-sm">{so.equipmentName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {so.priority && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityVariant(so.priority)}`}>
                          {getPriorityLabel(so.priority)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusVariant(so.status)}`}>
                        {getStatusLabel(so.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(so.total))}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPaymentStatusVariant(so.paymentStatus)}`}>
                        {getPaymentStatusLabel(so.paymentStatus)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(so.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/ordens-servico/${so.id}`}>
                        <Button variant="outline" size="sm" className="rounded-lg">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
