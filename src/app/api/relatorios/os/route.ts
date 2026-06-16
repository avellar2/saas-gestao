import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { getMonthRange, getMonthParam } from "@/lib/relatorios-helpers";
import { checkReportModuleAccess } from "@/lib/relatorios-server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { searchParams } = new URL(request.url);
  const month = getMonthParam(searchParams);

  const access = await checkReportModuleAccess(companyId, "service_orders");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const { start, end } = getMonthRange(month);
  const tenant = tenantPrisma(companyId);

  const [
    totalOS,
    abertas,
    concluidas,
    canceladas,
    receitaGeradaAgg,
    statusDistribution,
    topClientes,
    porTecnico,
  ] = await Promise.all([
    // OS criadas no mês
    tenant.serviceOrder.count({
      where: { createdAt: { gte: start, lte: end } },
    }),

    // OS abertas (status != COMPLETED/CANCELLED) — contagem atual
    tenant.serviceOrder.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),

    // OS concluídas no mês (completedAt ou updatedAt como fallback)
    tenant.serviceOrder.count({
      where: {
        OR: [
          { completedAt: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end }, status: "COMPLETED" },
        ],
      },
    }),

    // OS canceladas no mês (updatedAt como proxy)
    tenant.serviceOrder.count({
      where: { status: "CANCELLED", updatedAt: { gte: start, lte: end } },
    }),

    // Receita gerada pelas OS concluídas no mês
    tenant.serviceOrder.aggregate({
      _sum: { total: true },
      where: {
        OR: [
          { completedAt: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end }, status: "COMPLETED" },
        ],
      },
    }).then(r => Number(r._sum.total) || 0),

    // Distribuição por status (contagem atual)
    tenant.serviceOrder.groupBy({
      by: ["status"],
      _count: true,
    }).then(rows => rows.map(r => ({ status: r.status, count: r._count }))),

    // Top 5 clientes por receita de OS no mês
    tenant.serviceOrder.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        total: true,
        customer: { select: { name: true } },
      },
    }).then(rows => {
      const map: Record<string, { valor: number; os: number }> = {};
      for (const r of rows) {
        const name = r.customer?.name || "Sem nome";
        if (!map[name]) map[name] = { valor: 0, os: 0 };
        map[name].valor += Number(r.total);
        map[name].os += 1;
      }
      return Object.entries(map)
        .sort(([, a], [, b]) => b.valor - a.valor)
        .slice(0, 5)
        .map(([cliente, data]) => ({ cliente, ...data }));
    }),

    // Por técnico (se existir technicianId)
    tenant.serviceOrder.groupBy({
      by: ["technicianId"],
      where: { technicianId: { not: null }, createdAt: { gte: start, lte: end } },
      _count: true,
    }).then(async rows => {
      if (rows.length === 0) return [];
      const userIds = rows.map(r => r.technicianId).filter(Boolean) as string[];
      const users = await tenant.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.name]));
      return rows.map(r => ({
        tecnico: userMap.get(r.technicianId!) || "Técnico removido",
        total: r._count,
        concluidas: 0, // simplificado: não vamos contar por status aqui
      })).sort((a, b) => b.total - a.total);
    }),
  ]);

  const ticketMedio = concluidas > 0 ? receitaGeradaAgg / concluidas : 0;

  return NextResponse.json({
    month,
    resumo: {
      total: totalOS,
      abertas,
      concluidas,
      canceladas,
      receitaGerada: receitaGeradaAgg,
      ticketMedio,
    },
    statusDistribution,
    topClientes,
    porTecnico,
  });
}
