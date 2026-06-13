import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import { ServiceOrderStatus, PaymentStatus } from "@/generated/prisma/client";
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

interface SearchParams {
  status?: string;
  sort?: string;
}

const STATUS_TABS = [
  { label: "Todas", value: "" },
  { label: "Aberta", value: "OPENED" },
  { label: "Em Andamento", value: "IN_PROGRESS" },
  { label: "Aguardando Pecas", value: "WAITING_PARTS" },
  { label: "Finalizada", value: "FINISHED" },
  { label: "Entregue", value: "DELIVERED" },
  { label: "Cancelada", value: "CANCELLED" },
];

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "OPENED":
      return "secondary";
    case "IN_PROGRESS":
      return "outline";
    case "WAITING_PARTS":
      return "outline";
    case "FINISHED":
      return "default";
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "OPENED":
      return "Aberta";
    case "IN_PROGRESS":
      return "Em Andamento";
    case "WAITING_PARTS":
      return "Aguardando Pecas";
    case "FINISHED":
      return "Finalizada";
    case "DELIVERED":
      return "Entregue";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

function getPaymentVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "PARTIAL":
      return "outline";
    case "PENDING":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getPaymentLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PARTIAL":
      return "Parcial";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

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
                  <TableHead>No</TableHead>
                  <TableHead>Cliente</TableHead>
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
                    <TableCell className="font-medium">#{so.number}</TableCell>
                    <TableCell>{so.customer.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(so.status)}>
                        {getStatusLabel(so.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(so.total))}</TableCell>
                    <TableCell>
                      <Badge variant={getPaymentVariant(so.paymentStatus)}>
                        {getPaymentLabel(so.paymentStatus)}
                      </Badge>
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
