import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { getMonthRange, getMonthParam } from "@/lib/relatorios-helpers";
import { isModuleActive } from "@/lib/module-guard";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { searchParams } = new URL(request.url);
  const month = getMonthParam(searchParams);
  const { start, end } = getMonthRange(month);

  const reportsActive = await isModuleActive(companyId, "reports");
  if (!reportsActive) {
    return NextResponse.json({ error: "Módulo reports não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  // Descobrir módulos ativos
  const [financeActive, menuActive, inventoryActive, osActive] = await Promise.all([
    isModuleActive(companyId, "finance"),
    isModuleActive(companyId, "menu"),
    isModuleActive(companyId, "inventory"),
    isModuleActive(companyId, "service_orders"),
  ]);

  const now = new Date();

  // Queries paralelas — cada grupo só roda se o módulo estiver ativo
  const queries: Promise<unknown>[] = [];

  // Financeiro
  let receitaMesP = Promise.resolve(0);
  let despesaMesP = Promise.resolve(0);
  let contasVencidasP = Promise.resolve(0);
  let receitaDiariaP = Promise.resolve([] as { date: string; valor: number }[]);
  let despesaDiariaP = Promise.resolve([] as { date: string; valor: number }[]);
  let receitaPorOrigemP = Promise.resolve([] as { origem: string; valor: number }[]);

  if (financeActive) {
    receitaMesP = tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.amount) || 0);

    despesaMesP = tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.amount) || 0);

    contasVencidasP = tenant.financialTransaction.count({
      where: { status: "PENDING", dueDate: { lt: now } },
    });

    // Receitas por dia
    receitaDiariaP = tenant.financialTransaction.findMany({
      where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true, paidAt: true },
    }).then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) {
        if (!r.paidAt) continue;
        const day = r.paidAt.toISOString().slice(0, 10);
        map[day] = (map[day] || 0) + Number(r.amount);
      }
      return Object.entries(map).map(([date, valor]) => ({ date, valor }));
    });

    // Despesas por dia
    despesaDiariaP = tenant.financialTransaction.findMany({
      where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end } },
      select: { amount: true, paidAt: true },
    }).then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) {
        if (!r.paidAt) continue;
        const day = r.paidAt.toISOString().slice(0, 10);
        map[day] = (map[day] || 0) + Number(r.amount);
      }
      return Object.entries(map).map(([date, valor]) => ({ date, valor }));
    });

    // Receita por origem
    receitaPorOrigemP = tenant.financialTransaction.findMany({
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
    });
  }

  // OS
  let osAbertasP = Promise.resolve(0);
  let osConcluidasMesP = Promise.resolve(0);

  if (osActive) {
    osAbertasP = tenant.serviceOrder.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    });
    osConcluidasMesP = tenant.serviceOrder.count({
      where: {
        OR: [
          { completedAt: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end }, status: "COMPLETED" },
        ],
      },
    });
  }

  // Cardápio
  let pedidosEntreguesMesP = Promise.resolve(0);
  let receitaCardapioP = Promise.resolve(0);

  if (menuActive) {
    pedidosEntreguesMesP = tenant.menuOrder.count({
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
    });
    receitaCardapioP = tenant.menuOrder.aggregate({
      _sum: { total: true },
      where: { status: "DELIVERED", paidAt: { gte: start, lte: end } },
    }).then(r => Number(r._sum.total) || 0);
  }

  // Estoque
  let produtosBaixoP = Promise.resolve(0);
  let produtosZeradosP = Promise.resolve(0);
  let valorTotalEstoqueP = Promise.resolve(0);

  if (inventoryActive) {
    const allProductsP = tenant.product.findMany({
      select: { quantity: true, minStock: true, costPrice: true },
    });

    produtosBaixoP = allProductsP.then(products =>
      products.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minStock)).length
    );
    produtosZeradosP = allProductsP.then(products =>
      products.filter(p => Number(p.quantity) <= 0).length
    );
    valorTotalEstoqueP = allProductsP.then(products =>
      products.reduce((acc, p) => acc + Number(p.quantity) * (Number(p.costPrice) || 0), 0)
    );
  }

  // Aguardar tudo
  const [
    receitaMes,
    despesaMes,
    contasVencidas,
    receitaDiaria,
    despesaDiaria,
    receitaPorOrigem,
    osAbertas,
    osConcluidasMes,
    pedidosEntreguesMes,
    receitaCardapio,
    produtosBaixo,
    produtosZerados,
    valorTotalEstoque,
  ] = await Promise.all([
    receitaMesP,
    despesaMesP,
    contasVencidasP,
    receitaDiariaP,
    despesaDiariaP,
    receitaPorOrigemP,
    osAbertasP,
    osConcluidasMesP,
    pedidosEntreguesMesP,
    receitaCardapioP,
    produtosBaixoP,
    produtosZeradosP,
    valorTotalEstoqueP,
  ]);

  const saldoMes = receitaMes - despesaMes;
  const ticketMedioCardapio = pedidosEntreguesMes > 0 ? receitaCardapio / pedidosEntreguesMes : 0;

  // Combinar receita/despesa diária em um único array
  const allDays = new Set<string>();
  for (const d of receitaDiaria) allDays.add(d.date);
  for (const d of despesaDiaria) allDays.add(d.date);
  const receitaDespesaDiaria = Array.from(allDays).sort().map(date => ({
    date,
    receita: receitaDiaria.find(d => d.date === date)?.valor || 0,
    despesa: despesaDiaria.find(d => d.date === date)?.valor || 0,
  }));

  return NextResponse.json({
    month,
    cards: {
      receitaMes,
      despesaMes,
      saldoMes,
      osAbertas,
      osConcluidasMes,
      pedidosEntreguesMes,
      contasVencidas,
      produtosBaixo,
      produtosZerados,
      ticketMedioCardapio,
      valorTotalEstoque,
    },
    charts: {
      receitaDespesaDiaria,
      receitaPorOrigem,
    },
    activeModules: {
      finance: financeActive,
      menu: menuActive,
      inventory: inventoryActive,
      service_orders: osActive,
    },
  });
}
