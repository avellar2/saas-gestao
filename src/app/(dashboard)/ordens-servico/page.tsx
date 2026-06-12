import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { ServiceOrderStatus, PaymentStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

interface SearchParams {
  status?: string;
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
  if (!session) {
    return null;
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};
  if (
    statusFilter &&
    Object.values(ServiceOrderStatus).includes(
      statusFilter as ServiceOrderStatus
    )
  ) {
    where.status = statusFilter;
  }

  const serviceOrders = await tenant.serviceOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ordens de Servico</h1>
        <Link href="/ordens-servico/novo">
          <Button>Nova OS</Button>
        </Link>
      </div>

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
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </div>

      {serviceOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {statusFilter
            ? "Nenhuma ordem de servico encontrada com esse status."
            : "Nenhuma ordem de servico cadastrada. Clique em 'Nova OS' para comecar."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={so.id}>
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
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}