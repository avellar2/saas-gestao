import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { History } from "lucide-react";

const ENTITY_LABELS: Record<string, string> = {
  customer: "Cliente",
  quote: "Orcamento",
  service_order: "Ordem de Servico",
  product: "Produto",
  financial: "Financeiro",
  appointment: "Agendamento",
  catalog: "Catalogo",
  menu: "Cardapio",
  user: "Usuario",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Excluido",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Historico de Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro de todas as acoes realizadas no sistema
        </p>
      </div>

      {/* Entity filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/atividades"
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !currentEntity
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todas
        </Link>
        {entities.map((entity) => (
          <Link
            key={entity}
            href={`/atividades?entity=${entity}`}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentEntity === entity
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {ENTITY_LABELS[entity]}
          </Link>
        ))}
      </div>

      {/* Activities table */}
      <div className="bg-card rounded-[1.25rem] border border-border/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Data / Hora
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Usuario
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Acao
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Entidade
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-0">
                    <EmptyState
                      title="Nenhuma atividade registrada"
                      description="As acoes realizadas no sistema aparecerao aqui automaticamente."
                      icon={History}
                    />
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDateTime(activity.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                      {activity.userName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={ACTION_VARIANTS[activity.action] || "default"}
                      >
                        {ACTION_LABELS[activity.action] || activity.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {ENTITY_LABELS[activity.entity] || activity.entity}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground/70 max-w-xs truncate">
                      {activity.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {total} registro{total !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link
                  href={`/atividades?page=${currentPage - 1}${currentEntity ? `&entity=${currentEntity}` : ""}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground bg-card border border-border/60 hover:bg-muted/50 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/atividades?page=${currentPage + 1}${currentEntity ? `&entity=${currentEntity}` : ""}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground bg-card border border-border/60 hover:bg-muted/50 transition-colors"
                >
                  Proximo
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
