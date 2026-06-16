import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { getMonthRange, getMonthParam } from "@/lib/relatorios-helpers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { searchParams } = new URL(request.url);
  const month = getMonthParam(searchParams);
  const { start, end } = getMonthRange(month);

  const tenant = tenantPrisma(companyId);

  const [total, novosNoPeriodo, topClientesReceita, clientesMaisOS] = await Promise.all([
    // Total de clientes
    tenant.customer.count(),

    // Novos no período
    tenant.customer.count({
      where: { createdAt: { gte: start, lte: end } },
    }),

    // Top 5 clientes por receita de OS no mês
    tenant.serviceOrder.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        total: true,
        customer: { select: { id: true, name: true } },
      },
    }).then(rows => {
      const map: Record<string, { receita: number; os: number; nome: string }> = {};
      for (const r of rows) {
        if (!r.customer) continue;
        const id = r.customer.id;
        if (!map[id]) map[id] = { receita: 0, os: 0, nome: r.customer.name || "Sem nome" };
        map[id].receita += Number(r.total);
        map[id].os += 1;
      }
      return Object.entries(map)
        .sort(([, a], [, b]) => b.receita - a.receita)
        .slice(0, 5)
        .map(([, data]) => ({ cliente: data.nome, receita: data.receita, os: data.os }));
    }),

    // Top 5 clientes com mais OS (all-time)
    tenant.serviceOrder.groupBy({
      by: ["customerId"],
      _count: true,
      orderBy: { _count: { customerId: "desc" } },
      take: 5,
    }).then(async rows => {
      if (rows.length === 0) return [];
      const customerIds = rows.map(r => r.customerId);
      const customers = await tenant.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      });
      const customerMap = new Map(customers.map(c => [c.id, c.name]));
      return rows.map(r => ({
        cliente: customerMap.get(r.customerId) || "Cliente removido",
        total: r._count,
      }));
    }),
  ]);

  return NextResponse.json({
    month,
    resumo: { total, novosNoPeriodo },
    topClientesReceita,
    clientesMaisOS,
  });
}
