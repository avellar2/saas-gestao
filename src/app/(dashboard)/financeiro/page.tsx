import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";
import { DollarSign } from "lucide-react";

interface SearchParams {
  type?: string;
  status?: string;
  search?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border";
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
  };
  return (
    <Badge variant="outline" className={colors}>
      {labels[status] || status}
    </Badge>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const hasAccess = await isModuleActive(companyId, "finance");
  if (!hasAccess) redirect("/upgrade?module=finance");

  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const type = params.type || "";
  const status = params.status || "";
  const search = params.search || "";
  const sort = params.sort || "createdAt_desc";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) where.description = { contains: search, mode: "insensitive" };
  if (dateFrom || dateTo) {
    const dueDateFilter: Record<string, Date> = {};
    if (dateFrom) dueDateFilter.gte = new Date(dateFrom);
    if (dateTo) dueDateFilter.lte = new Date(dateTo);
    where.dueDate = dueDateFilter;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [transactions, total] = await Promise.all([
    tenant.financialTransaction.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    tenant.financialTransaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Calculate totals
  const allTransactions = await tenant.financialTransaction.findMany({
    where: {},
  });

  let totalReceivable = 0;
  let totalPayable = 0;

  for (const t of allTransactions) {
    const amount = Number(t.amount);
    if (t.type === "RECEIVABLE") {
      totalReceivable += amount;
    } else {
      totalPayable += amount;
    }
  }

  const balance = totalReceivable - totalPayable;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-2">
          <a href="/api/exportar?entity=financial" download>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </a>
          <Link href="/financeiro/novo">
            <Button>Nova Transacao</Button>
          </Link>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[1.25rem] border border-border/60 p-5 bg-emerald-500/5 dark:bg-emerald-500/10">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">A Receber</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(totalReceivable)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-border/60 p-5 bg-destructive/5 dark:bg-destructive/10">
          <p className="text-sm text-destructive font-medium">A Pagar</p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(totalPayable)}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-border/60 p-5 bg-primary/5 dark:bg-primary/10">
          <p className="text-sm text-primary font-medium">Saldo</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/financeiro"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              !type && !status ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-muted"
            }`}
          >
            Todas
          </Link>
          <Link
            href="/financeiro?type=RECEIVABLE"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              type === "RECEIVABLE" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-muted"
            }`}
          >
            A Receber
          </Link>
          <Link
            href="/financeiro?type=PAYABLE"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              type === "PAYABLE" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-muted"
            }`}
          >
            A Pagar
          </Link>
          <Link
            href="/financeiro?status=PENDING"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              status === "PENDING" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-muted"
            }`}
          >
            Pendentes
          </Link>
          <Link
            href="/financeiro?status=PAID"
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              status === "PAID" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-muted"
            }`}
          >
            Pagas
          </Link>
        </div>

        <form className="flex flex-wrap items-center gap-3" action="/financeiro" method="GET">
          <input
            name="search"
            type="text"
            placeholder="Buscar por descricao..."
            defaultValue={search}
            className="flex-1 min-w-[180px] h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
          <input
            name="dateFrom"
            type="date"
            defaultValue={dateFrom}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-sm text-muted-foreground">ate</span>
          <input
            name="dateTo"
            type="date"
            defaultValue={dateTo}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {type && <input type="hidden" name="type" value={type} />}
          {status && <input type="hidden" name="status" value={status} />}
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          <SortSelect
            options={[
              { value: "createdAt_desc", label: "Mais recentes" },
              { value: "createdAt_asc", label: "Mais antigos" },
              { value: "amount_desc", label: "Maior valor" },
              { value: "amount_asc", label: "Menor valor" },
              { value: "dueDate_asc", label: "Vencimento" },
            ]}
            defaultValue={sort}
          />
        </form>
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon={DollarSign}
          title={search ? "Nenhum resultado" : "Nenhuma transação"}
          description={search ? "Tente ajustar os termos da busca." : "Cadastre sua primeira transação para começar."}
          actionLabel="Nova Transação"
          actionHref="/financeiro/novo"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.type === "RECEIVABLE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {transaction.type === "RECEIVABLE" ? "Receber" : "Pagar"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(transaction.amount))}</TableCell>
                    <TableCell>
                      {transaction.dueDate
                        ? formatDate(transaction.dueDate)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>
                      {transaction.customer?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/financeiro/${transaction.id}`}>
                        <Button variant="outline" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => {
                  const linkParams = new URLSearchParams();
                  if (search) linkParams.set("search", search);
                  if (type) linkParams.set("type", type);
                  if (status) linkParams.set("status", status);
                  if (sort !== "createdAt_desc") linkParams.set("sort", sort);
                  if (dateFrom) linkParams.set("dateFrom", dateFrom);
                  if (dateTo) linkParams.set("dateTo", dateTo);
                  linkParams.set("page", String(p));
                  return (
                    <Link
                      key={p}
                      href={`/financeiro?${linkParams.toString()}`}
                    >
                      <Button
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                      >
                        {p}
                      </Button>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
