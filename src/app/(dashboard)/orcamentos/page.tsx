import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import { QuoteStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, FileText } from "lucide-react";
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
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "quotes");
  if (!hasAccess) redirect("/upgrade?module=quotes");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const statusFilter = params.status || "";
  const sort = params.sort || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (statusFilter && Object.values(QuoteStatus).includes(statusFilter as QuoteStatus)) {
    where.status = statusFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const quotes = await tenant.quote.findMany({
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orcamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie orçamentos e propostas</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=quotes" download>
            <Button variant="outline" className="rounded-xl">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/orcamentos/novo">
            <Button className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orcamento
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link key={tab.value} href={tab.value ? `/orcamentos?status=${tab.value}` : "/orcamentos"}>
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

      {quotes.length === 0 ? (
        <EmptyState
          title={statusFilter ? "Nenhum resultado" : "Nenhum orçamento cadastrado"}
          description={
            statusFilter
              ? "Nenhum orçamento encontrado com esse status."
              : "Crie seu primeiro orçamento para enviar aos clientes."
          }
          icon={FileText}
          actionLabel="Novo Orcamento"
          actionHref="/orcamentos/novo"
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
                  <TableHead>Data</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id} className="hover:bg-muted/20 transition-colors">
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
