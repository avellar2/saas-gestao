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

  const access = await checkReportModuleAccess(companyId, "finance");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const { start, end } = getMonthRange(month);
  const tenant = tenantPrisma(companyId);
  const now = new Date();

  const [
    receitas,
    despesas,
    contasVencidas,
    contasPendentes,
    receitasPorDiaRaw,
    despesasPorDiaRaw,
    receitasPorOrigemRaw,
    despesasPorCategoriaRaw,
  ] = await Promise.all([
    // Receitas PAID no período
    tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.amount) || 0),

    // Despesas PAID no período
    tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.amount) || 0),

    // BUG-002 fix: contas vencidas/pendentes respeitam o mês selecionado (dueDate)
    tenant.financialTransaction.count({
      where: { status: "PENDING", dueDate: { lt: now, gte: start, lte: end } },
    }),

    // Contas pendentes (PENDING + dueDate >= hoje, dentro do mês)
    tenant.financialTransaction.count({
      where: { status: "PENDING", dueDate: { gte: now, lte: end } },
    }),

    // Receitas por dia
    tenant.financialTransaction.findMany({
      where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true, paidAt: true },
    }).then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) {
        if (!r.paidAt) continue;
        const day = r.paidAt.toISOString().slice(0, 10);
        map[day] = (map[day] || 0) + Number(r.amount);
      }
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, valor]) => ({ date, valor }));
    }),

    // Despesas por dia
    tenant.financialTransaction.findMany({
      where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true, paidAt: true },
    }).then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) {
        if (!r.paidAt) continue;
        const day = r.paidAt.toISOString().slice(0, 10);
        map[day] = (map[day] || 0) + Number(r.amount);
      }
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, valor]) => ({ date, valor }));
    }),

    // Receitas por origem
    tenant.financialTransaction.findMany({
      where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true, serviceOrderId: true, menuOrderId: true },
    }).then(rows => {
      const map: Record<string, number> = { manual: 0, os: 0, cardapio: 0 };
      for (const r of rows) {
        const origem = r.serviceOrderId ? "os" : r.menuOrderId ? "cardapio" : "manual";
        map[origem] = (map[origem] || 0) + Number(r.amount);
      }
      return Object.entries(map)
        .filter(([, v]) => v > 0)
        .map(([origem, valor]) => ({ origem, valor }));
    }),

    // Despesas por categoria (top 5)
    tenant.financialTransaction.groupBy({
      by: ["category"],
      where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end }, category: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }).then(rows => rows.map(r => ({ categoria: r.category || "Sem categoria", valor: Number(r._sum.amount) || 0 }))),
  ]);

  const saldo = receitas - despesas;

  return NextResponse.json({
    month,
    resumo: { receitas, despesas, saldo, contasVencidas, contasPendentes },
    receitasPorDia: receitasPorDiaRaw,
    despesasPorDia: despesasPorDiaRaw,
    receitasPorOrigem: receitasPorOrigemRaw,
    despesasPorCategoria: despesasPorCategoriaRaw,
  });
}
