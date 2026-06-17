import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isModuleActive } from "@/lib/module-guard";
import { tenantPrisma } from "@/lib/prisma";
import { ServiceOrderStatus } from "@/generated/prisma/client";
import Link from "next/link";
import { Plus, FileDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SortSelect } from "@/components/sort-select";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/layout/status-badge";

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

  const activeLabel = STATUS_TABS.find((t) => t.value === statusFilter)?.label ?? "Todas";

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* ── Header Premium ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">
            Ordens de Serviço
          </h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">
            {serviceOrders.length === 0
              ? "Nenhuma ordem cadastrada"
              : `${serviceOrders.length} ${serviceOrders.length === 1 ? "ordem" : "ordens"} ${activeLabel.toLowerCase()}${statusFilter ? "" : " no sistema"}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a href="/api/exportar?entity=service_orders" download>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 px-3.5 rounded-lg border-border/80 hover:bg-muted/50 transition-all duration-150"
            >
              <FileDown className="h-4 w-4" />
              Exportar
            </Button>
          </a>
          <Link href="/ordens-servico/novo">
            <Button
              size="sm"
              className="gap-2 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-150 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filtros Premium ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={
                  tab.value
                    ? `/ordens-servico?status=${tab.value}`
                    : "/ordens-servico"
                }
              >
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none",
                    isActive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="sm:ml-auto">
          <SortSelect
            options={[
              { value: "createdAt_desc", label: "Mais recentes" },
              { value: "total_desc", label: "Maior valor" },
              { value: "total_asc", label: "Menor valor" },
            ]}
            defaultValue={sort}
          />
        </div>
      </div>

      {/* ── Tabela Premium ── */}
      {serviceOrders.length === 0 ? (
        <EmptyState
          title={statusFilter ? "Nenhum resultado" : "Nenhuma ordem cadastrada"}
          description={
            statusFilter
              ? "Nenhuma ordem encontrada com esse status."
              : "Crie sua primeira ordem de serviço."
          }
          icon="ClipboardList"
          actionLabel="Nova OS"
          actionHref="/ordens-servico/novo"
        />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                  <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 w-24">
                    OS
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Cliente
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Equipamento
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Prioridade
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Status
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right">
                    Total
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Pagamento
                  </TableHead>
                  <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                    Data
                  </TableHead>
                  <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 text-right w-16">
                    {/* Empty — icon column */}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.map((so, index) => (
                  <TableRow
                    key={so.id}
                    className={cn(
                      "group border-b border-border/30 transition-colors duration-150 cursor-pointer hover:bg-emerald-50/30",
                      index === serviceOrders.length - 1 && "border-b-0"
                    )}
                  >
                    <TableCell className="py-3.5 pl-5 pr-3">
                      <Link
                        href={`/ordens-servico/${so.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-sm text-foreground hover:text-emerald-600 transition-colors tabular-nums"
                      >
                        {so.code || `#${so.number}`}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <span className="font-medium text-sm text-foreground">
                        {so.customer.name}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      {so.equipmentName ? (
                        <span className="text-sm text-muted-foreground">
                          {so.equipmentName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      {so.priority ? (
                        <StatusPill
                          kind="serviceOrderPriority"
                          value={so.priority}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <StatusPill
                        kind="serviceOrder"
                        value={so.status}
                      />
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-right">
                      <span className="font-semibold tabular-nums text-sm text-foreground">
                        {formatCurrency(Number(so.total))}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <StatusPill
                        kind="payment"
                        value={so.paymentStatus}
                      />
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                      {formatDate(so.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5 pl-3 pr-5 text-right">
                      <Link
                        href={`/ordens-servico/${so.id}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/40 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150"
                      >
                        <ChevronRight className="w-4 h-4" />
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
