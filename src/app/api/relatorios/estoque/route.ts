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

  const access = await checkReportModuleAccess(companyId, "inventory");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const { start, end } = getMonthRange(month);
  const tenant = tenantPrisma(companyId);

  const [
    allProducts,
    movimentacoesNoPeriodo,
    entradasAgg,
    saidasAgg,
    produtosMaisMovimentados,
    movimentacoesPorOrigem,
  ] = await Promise.all([
    // Todos os produtos para cálculos de baixo/zerado/valor
    tenant.product.findMany({
      select: { id: true, name: true, quantity: true, minStock: true, costPrice: true },
    }),

    // Total de movimentações no período
    tenant.stockMovement.count({
      where: { createdAt: { gte: start, lte: end } },
    }),

    // Soma de entradas
    tenant.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { type: "IN", createdAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.quantity) || 0),

    // Soma de saídas
    tenant.stockMovement.aggregate({
      _sum: { quantity: true },
      where: { type: "OUT", createdAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.quantity) || 0),

    // Produtos mais movimentados (top 5)
    tenant.stockMovement.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
      _sum: { quantity: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }).then(async rows => {
      if (rows.length === 0) return [];
      const productIds = rows.map(r => r.productId);
      const products = await tenant.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const productMap = new Map(products.map(p => [p.id, p.name]));

      // Para cada produto, contar entradas e saídas separadamente
      const result = [];
      for (const row of rows) {
        const entradas = await tenant.stockMovement.aggregate({
          _sum: { quantity: true },
          where: { productId: row.productId, type: "IN", createdAt: { gte: start, lte: end } },
        });
        const saidas = await tenant.stockMovement.aggregate({
          _sum: { quantity: true },
          where: { productId: row.productId, type: "OUT", createdAt: { gte: start, lte: end } },
        });
        result.push({
          produto: productMap.get(row.productId) || "Produto removido",
          movimentacoes: row._count,
          entradas: Number(entradas._sum.quantity) || 0,
          saidas: Number(saidas._sum.quantity) || 0,
        });
      }
      return result;
    }),

    // Movimentações por origem
    tenant.stockMovement.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { serviceOrderId: true },
    }).then(rows => {
      const map: Record<string, number> = { manual: 0, os: 0 };
      for (const r of rows) {
        const origem = r.serviceOrderId ? "os" : "manual";
        map[origem] = (map[origem] || 0) + 1;
      }
      return Object.entries(map)
        .filter(([, v]) => v > 0)
        .map(([origem, total]) => ({ origem, total }));
    }),
  ]);

  const produtosBaixo = allProducts.filter(
    p => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minStock)
  );
  const produtosZerados = allProducts.filter(p => Number(p.quantity) <= 0);
  const valorTotalEstoque = allProducts.reduce(
    (acc, p) => acc + Number(p.quantity) * (Number(p.costPrice) || 0), 0
  );

  return NextResponse.json({
    month,
    resumo: {
      produtosBaixo: produtosBaixo.length,
      produtosZerados: produtosZerados.length,
      valorTotalEstoque,
      movimentacoesNoPeriodo,
      entradas: entradasAgg,
      saidas: saidasAgg,
    },
    produtosBaixoLista: produtosBaixo.slice(0, 10).map(p => ({
      id: p.id,
      nome: p.name,
      quantidade: Number(p.quantity),
      minStock: Number(p.minStock),
    })),
    produtosZeradosLista: produtosZerados.slice(0, 10).map(p => ({
      id: p.id,
      nome: p.name,
    })),
    produtosMaisMovimentados,
    movimentacoesPorOrigem,
  });
}
