import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import { QuoteStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Plus, ChevronRight } from "lucide-react";
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

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "SENT":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
    case "EXPIRED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DRAFT":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT": return "Rascunho";
    case "SENT": return "Enviado";
    case "APPROVED": return "Aprovado";
    case "REJECTED": return "Rejeitado";
    case "EXPIRED": return "Expirado";
    default: return status;
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

  const [quotes, total] = await Promise.all([
    tenant.quote.findMany({
      where,
      orderBy,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    tenant.quote.count({ where }),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[2.25rem] font-extrabold text-foreground">Orçamentos</h1>
          <p className="text-base font-medium text-muted-foreground mt-1">{total} {total === 1 ? "orçamento" : "orçamentos"}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=quotes" download>
            <Button variant="outline" className="rounded-lg h-9 px-3.5 border-border/80 hover:bg-muted/50 transition-all duration-150">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </a>
          <Link href="/orcamentos/novo">
            <Button className="rounded-lg h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 active:scale-[0.97]">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link key={tab.value} href={tab.value ? `/orcamentos?status=${tab.value}` : "/orcamentos"}>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer transition-all duration-150 ${
                  statusFilter === tab.value
                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {tab.label}
              </span>
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
          icon="FileText"
          actionLabel="Novo Orçamento"
          actionHref="/orcamentos/novo"
        />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 transition-colors">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Nº</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Total</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Data</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow
                    key={quote.id}
                    className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer border-b border-border/30 last:border-0"
                  >
                    <TableCell className="text-sm text-foreground font-medium px-4 py-3.5">#{String(quote.number).padStart(4, "0")}</TableCell>
                    <TableCell className="text-sm text-foreground px-4 py-3.5">{quote.customer.name}</TableCell>
                    <TableCell className="text-sm text-foreground px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadgeClass(quote.status)}`}>
                        {getStatusLabel(quote.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground px-4 py-3.5">{formatCurrency(Number(quote.total))}</TableCell>
                    <TableCell className="text-sm text-foreground px-4 py-3.5">{formatDate(quote.createdAt)}</TableCell>
                    <TableCell className="text-sm text-foreground px-4 py-3.5 text-right">
                      <Link href={`/orcamentos/${quote.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                          <ChevronRight className="h-4 w-4" />
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
