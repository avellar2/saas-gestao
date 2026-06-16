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

  const access = await checkReportModuleAccess(companyId, "menu");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const { start, end } = getMonthRange(month);
  const tenant = tenantPrisma(companyId);

  const [
    pedidosEntregues,
    pedidosCancelados,
    receitaAgg,
    vendasPorPagamento,
    itensMaisVendidos,
    vendasPorDia,
  ] = await Promise.all([
    // Pedidos entregues no mês
    tenant.menuOrder.count({
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
    }),

    // Pedidos cancelados no mês
    tenant.menuOrder.count({
      where: { status: "CANCELLED", updatedAt: { gte: start, lte: end } },
    }),

    // Receita dos entregues
    tenant.menuOrder.aggregate({
      _sum: { total: true },
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.total) || 0),

    // Vendas por forma de pagamento
    tenant.menuOrder.groupBy({
      by: ["paymentMethod"],
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end }, paymentMethod: { not: null } },
      _count: true,
      _sum: { total: true },
    }).then(rows => rows.map(r => ({
      metodo: r.paymentMethod || "OUTRO",
      total: r._count,
      valor: Number(r._sum.total) || 0,
    }))),

    // Itens mais vendidos (top 5)
    tenant.menuOrderItem.findMany({
      where: {
        order: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
      },
      select: {
        nameSnapshot: true,
        quantity: true,
        total: true,
      },
    }).then(items => {
      const map: Record<string, { quantidade: number; valor: number }> = {};
      for (const item of items) {
        const name = item.nameSnapshot || "Item removido";
        if (!map[name]) map[name] = { quantidade: 0, valor: 0 };
        map[name].quantidade += item.quantity;
        map[name].valor += Number(item.total);
      }
      return Object.entries(map)
        .sort(([, a], [, b]) => b.quantidade - a.quantidade)
        .slice(0, 5)
        .map(([item, data]) => ({ item, ...data }));
    }),

    // Vendas por dia
    tenant.menuOrder.findMany({
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
      select: { total: true, paidAt: true },
    }).then(rows => {
      const map: Record<string, { pedidos: number; valor: number }> = {};
      for (const r of rows) {
        if (!r.paidAt) continue;
        const day = r.paidAt.toISOString().slice(0, 10);
        if (!map[day]) map[day] = { pedidos: 0, valor: 0 };
        map[day].pedidos += 1;
        map[day].valor += Number(r.total);
      }
      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }));
    }),
  ]);

  const ticketMedio = pedidosEntregues > 0 ? receitaAgg / pedidosEntregues : 0;

  return NextResponse.json({
    month,
    resumo: {
      pedidosEntregues,
      pedidosCancelados,
      receita: receitaAgg,
      ticketMedio,
    },
    vendasPorPagamento,
    itensMaisVendidos,
    vendasPorDia,
  });
}
