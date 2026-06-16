import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

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
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "Parâmetros start e end são obrigatórios (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const start = new Date(`${startParam}T00:00:00.000`);
  const end = new Date(`${endParam}T23:59:59.999`);

  // Apenas transações PAID com paidAt dentro do período
  const transactions = await tenant.financialTransaction.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: start, lte: end },
    },
    orderBy: { paidAt: "asc" },
  });

  // Agrupa por dia
  const dailyMap: Record<
    string,
    { date: string; receivable: number; payable: number }
  > = {};

  for (const tx of transactions) {
    if (!tx.paidAt) continue;
    const dateKey = tx.paidAt.toISOString().slice(0, 10);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, receivable: 0, payable: 0 };
    }
    const amount = Number(tx.amount);
    if (tx.type === "RECEIVABLE") {
      dailyMap[dateKey].receivable += amount;
    } else {
      dailyMap[dateKey].payable += amount;
    }
  }

  // Ordena por data e calcula acumulado
  let accumulated = 0;
  const days = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => {
      const balance = day.receivable - day.payable;
      accumulated += balance;
      return {
        date: day.date,
        receivable: day.receivable,
        payable: day.payable,
        balance,
        accumulated,
      };
    });

  return NextResponse.json({
    start: startParam,
    end: endParam,
    days,
  });
}
