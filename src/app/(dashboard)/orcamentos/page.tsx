import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { QuoteStatus } from "@/generated/prisma/client";
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
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "DRAFT" },
  { label: "Enviado", value: "SENT" },
  { label: "Aprovado", value: "APPROVED" },
  { label: "Rejeitado", value: "REJECTED" },
  { label: "Expirado", value: "EXPIRED" },
];

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "SENT":
      return "outline";
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "SENT":
      return "Enviado";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    case "EXPIRED":
      return "Expirado";
    default:
      return status;
  }
}

export default async function OrcamentosPage({
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
  if (statusFilter && Object.values(QuoteStatus).includes(statusFilter as QuoteStatus)) {
    where.status = statusFilter;
  }

  const quotes = await tenant.quote.findMany({
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
        <h1 className="text-2xl font-bold">Orcamentos</h1>
        <Link href="/orcamentos/novo">
          <Button>Novo Orcamento</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link key={tab.value} href={tab.value ? `/orcamentos?status=${tab.value}` : "/orcamentos"}>
            <Button
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {statusFilter
            ? "Nenhum orcamento encontrado com esse status."
            : "Nenhum orcamento cadastrado. Clique em 'Novo Orcamento' para comecar."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">#{quote.number}</TableCell>
                <TableCell>{quote.customer.name}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(quote.status)}>
                    {getStatusLabel(quote.status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(Number(quote.total))}</TableCell>
                <TableCell>{formatDate(quote.createdAt)}</TableCell>
                <TableCell>
                  <Link href={`/orcamentos/${quote.id}`}>
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