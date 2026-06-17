import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

const ENTITY_LABELS: Record<string, string> = {
  customer: "Cliente",
  quote: "Orçamento",
  service_order: "Ordem de Serviço",
  product: "Produto",
  financial: "Financeiro",
  appointment: "Agendamento",
  catalog: "Catálogo",
  menu: "Cardápio",
  user: "Usuário",
};

const ACTION_CLASSES: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-slate-50 text-slate-700 border-slate-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Excluído",
};

interface AtividadesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AtividadesPage({ searchParams }: AtividadesPageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const tenant = tenantPrisma(companyId);

  const params = await searchParams;
  const currentEntity = params.entity || "";
  const currentPage = parseInt(params.page || "1", 10);
  const limit = 30;
  const skip = (currentPage - 1) * limit;

  const where: Record<string, unknown> = {};
  if (currentEntity) {
    where.entity = currentEntity;
  }

  const [activities, total] = await Promise.all([
    tenant.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    tenant.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const entities = Object.keys(ENTITY_LABELS);

  function formatDateTime(date: Date) {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-[2.25rem] font-extrabold tracking-tight text-foreground leading-none">Histórico de Atividades</h1>
        <p className="text-base text-muted-foreground mt-2 font-medium">{total} {total === 1 ? "registro" : "registros"}</p>
      </div>

      {/* Entity filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link href="/atividades">
          <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
            !currentEntity
              ? "bg-slate-50 border-slate-200 text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
          }`}>
            Todas
          </span>
        </Link>
        {entities.map((entity) => {
          const isActive = currentEntity === entity;
          return (
            <Link key={entity} href={`/atividades?entity=${entity}`}>
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 border cursor-pointer select-none ${
                isActive
                  ? "bg-slate-50 border-slate-200 text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
              }`}>
                {ENTITY_LABELS[entity]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25 hover:bg-muted/25 border-b border-border/50">
                <TableHead className="py-3.5 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 whitespace-nowrap">Data / Hora</TableHead>
                <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 whitespace-nowrap">Usuário</TableHead>
                <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Ação</TableHead>
                <TableHead className="py-3.5 px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70 whitespace-nowrap">Entidade</TableHead>
                <TableHead className="py-3.5 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-0 py-0">
                    <EmptyState
                      title="Nenhuma atividade registrada"
                      description="As ações realizadas no sistema aparecerão aqui automaticamente."
                      icon="History"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="group border-b border-border/30 transition-colors duration-150 hover:bg-slate-50/30 last:border-b-0"
                  >
                    <TableCell className="py-3.5 pl-5 pr-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(activity.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-sm font-medium text-foreground whitespace-nowrap">
                      {activity.userName}
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${ACTION_CLASSES[activity.action] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        {ACTION_LABELS[activity.action] || activity.action}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-sm text-muted-foreground whitespace-nowrap">
                      {ENTITY_LABELS[activity.entity] || activity.entity}
                    </TableCell>
                    <TableCell className="py-3.5 pl-3 pr-5 text-sm text-muted-foreground/70 max-w-xs truncate">
                      {activity.details || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              {total} registro{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={`/atividades?page=${p}${currentEntity ? `&entity=${currentEntity}` : ""}`}
                  >
                    <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer select-none ${
                      p === currentPage
                        ? "bg-slate-600 border-slate-600 text-white"
                        : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                    }`}>
                      {p}
                    </span>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
