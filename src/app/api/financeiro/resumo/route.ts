import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { getMonthRange, isOverdue } from "@/lib/finance-helpers";

async function checkModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(month);

  // Busca todas as transações do mês
  const transactions = await tenant.financialTransaction.findMany({
    where: {
      OR: [
        // PAID: filtrado por paidAt
        { status: "PAID", paidAt: { gte: start, lte: end } },
        // PENDING/OVERDUE/CANCELLED: filtrado por dueDate
        { status: { not: "PAID" }, dueDate: { gte: start, lte: end } },
      ],
    },
  });

  // Totais por tipo e status
  let receivableTotal = 0;
  let receivablePaid = 0;
  let receivablePending = 0;
  let receivableOverdue = 0;
  let payableTotal = 0;
  let payablePaid = 0;
  let payablePending = 0;
  let payableOverdue = 0;

  // Agrupamento por origem
  const byOrigin: Record<string, number> = { manual: 0, os: 0, menu: 0 };

  // Agrupamento por categoria
  const byCategory: Record<string, { category: string; type: string; amount: number }> = {};

  // Dados diários para gráfico
  const dailyMap: Record<string, { receivable: number; payable: number }> = {};

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const isPaid = tx.status === "PAID";
    const isCancelled = tx.status === "CANCELLED";
    const overdue = isOverdue(tx.status, tx.dueDate);

    // Origem
    if (tx.serviceOrderId) byOrigin.os += amount;
    else if (tx.menuOrderId) byOrigin.menu += amount;
    else byOrigin.manual += amount;

    // Categoria
    const catKey = tx.category || "Sem categoria";
    if (!byCategory[catKey]) {
      byCategory[catKey] = { category: catKey, type: tx.type, amount: 0 };
    }
    byCategory[catKey].amount += amount;

    // Totais por tipo
    // BUG-001/007 fix: separar realizado (PAID) de previsto (PENDING/OVERDUE)
    if (tx.type === "RECEIVABLE") {
      if (isPaid) {
        receivablePaid += amount;
      } else if (!isCancelled) {
        // PENDING ou OVERDUE
        receivableTotal += amount;
        if (overdue) receivableOverdue += amount;
        else receivablePending += amount;
      }
      // CANCELLED: ignorado
    } else if (tx.type === "PAYABLE") {
      if (isPaid) {
        payablePaid += amount;
      } else if (!isCancelled) {
        payableTotal += amount;
        if (overdue) payableOverdue += amount;
        else payablePending += amount;
      }
    }

    // Dados diários (apenas PAID usa paidAt, PENDING usa dueDate)
    const dateKey = isPaid && tx.paidAt
      ? tx.paidAt.toISOString().slice(0, 10)
      : tx.dueDate
        ? tx.dueDate.toISOString().slice(0, 10)
        : null;

    if (dateKey) {
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { receivable: 0, payable: 0 };
      }
      if (tx.type === "RECEIVABLE") {
        dailyMap[dateKey].receivable += amount;
      } else {
        dailyMap[dateKey].payable += amount;
      }
    }
  }

  const daily = Object.entries(dailyMap)
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // BUG-001 fix: saldo realizado = receitas pagas - despesas pagas
  const balance = receivablePaid - payablePaid;

  return NextResponse.json({
    month,
    receivable: {
      total: receivableTotal, // previsto (PENDING + OVERDUE)
      paid: receivablePaid,    // realizado
      pending: receivablePending,
      overdue: receivableOverdue,
    },
    payable: {
      total: payableTotal,
      paid: payablePaid,
      pending: payablePending,
      overdue: payableOverdue,
    },
    balance, // saldo realizado
    byOrigin,
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    daily,
  });
}
