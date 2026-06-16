import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { getMonthRange, getMonthParam, REPORT_LABELS } from "@/lib/relatorios-helpers";
import { REPORT_MODULE_MAP } from "@/lib/relatorios-server";
import { isModuleActive } from "@/lib/module-guard";
import { toCsv } from "@/lib/csv-export";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");
  const month = getMonthParam(searchParams);

  if (!tipo || !REPORT_MODULE_MAP[tipo]) {
    return NextResponse.json(
      { error: "Tipo inválido. Use: executivo, financeiro, os, cardapio, estoque, clientes" },
      { status: 400 }
    );
  }

  // Verificar módulo específico
  const moduleKey = REPORT_MODULE_MAP[tipo];
  if (moduleKey !== "reports") {
    const active = await isModuleActive(companyId, moduleKey);
    if (!active) {
      return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
    }
  }

  const reportsActive = await isModuleActive(companyId, "reports");
  if (!reportsActive) {
    return NextResponse.json({ error: "Módulo reports não ativo" }, { status: 403 });
  }

  const { start, end } = getMonthRange(month);
  const tenant = tenantPrisma(companyId);

  let headers: string[] = [];
  let rows: string[][] = [];

  switch (tipo) {
    case "executivo": {
      headers = ["Métrica", "Valor"];
      const [receitaMes, despesaMes, osAbertas, osConcluidas] = await Promise.all([
        tenant.financialTransaction.aggregate({
          _sum: { amount: true },
          where: { type: "RECEIVABLE", status: "PAID", paidAt: { gte: start, lte: end } },
        }).then(r => Number(r._sum.amount) || 0),
        tenant.financialTransaction.aggregate({
          _sum: { amount: true },
          where: { type: "PAYABLE", status: "PAID", paidAt: { gte: start, lte: end } },
        }).then(r => Number(r._sum.amount) || 0),
        tenant.serviceOrder.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
        tenant.serviceOrder.count({
          where: {
            OR: [
              { completedAt: { gte: start, lte: end } },
              { updatedAt: { gte: start, lte: end }, status: "COMPLETED" },
            ],
          },
        }),
      ]);
      rows = [
        ["Receita do mês", String(receitaMes)],
        ["Despesa do mês", String(despesaMes)],
        ["Saldo do mês", String(receitaMes - despesaMes)],
        ["OS abertas", String(osAbertas)],
        ["OS concluídas", String(osConcluidas)],
      ];
      break;
    }

    case "financeiro": {
      headers = ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Vencimento", "Pago em", "Status"];
      const data = await tenant.financialTransaction.findMany({
        where: {
          OR: [
            { status: "PAID", paidAt: { gte: start, lte: end } },
            { status: "PENDING", dueDate: { gte: start, lte: end } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      rows = data.map(item => [
        item.createdAt.toISOString().slice(0, 10),
        item.type === "RECEIVABLE" ? "Receita" : "Despesa",
        item.description,
        item.category || "",
        String(Number(item.amount)),
        item.dueDate ? item.dueDate.toISOString().slice(0, 10) : "",
        item.paidAt ? item.paidAt.toISOString().slice(0, 10) : "",
        item.status,
      ]);
      break;
    }

    case "os": {
      headers = ["Nº", "Cliente", "Status", "Total", "Criada em", "Concluída em"];
      const data = await tenant.serviceOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      rows = data.map(item => [
        String(item.number),
        item.customer?.name || "",
        item.status,
        String(Number(item.total)),
        item.createdAt.toISOString().slice(0, 10),
        item.completedAt ? item.completedAt.toISOString().slice(0, 10) : "",
      ]);
      break;
    }

    case "cardapio": {
      headers = ["Nº Pedido", "Status", "Total", "Pagamento", "Pago em"];
      const data = await tenant.menuOrder.findMany({
        where: { paidAt: { gte: start, lte: end } },
        orderBy: { paidAt: "desc" },
      });
      rows = data.map(item => [
        String(item.orderNumber),
        item.status,
        String(Number(item.total)),
        item.paymentMethod || "",
        item.paidAt ? item.paidAt.toISOString().slice(0, 10) : "",
      ]);
      break;
    }

    case "estoque": {
      headers = ["Data", "Produto", "Tipo", "Motivo", "Quantidade", "Anterior", "Novo", "Origem"];
      const data = await tenant.stockMovement.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      rows = data.map(item => [
        item.createdAt.toISOString().slice(0, 10),
        item.product.name,
        item.type,
        item.reason,
        String(Number(item.quantity)),
        String(Number(item.previousQuantity)),
        String(Number(item.newQuantity)),
        item.serviceOrderId ? "OS" : "Manual",
      ]);
      break;
    }

    case "clientes": {
      headers = ["Nome", "Telefone", "Email", "Total OS", "Criado em"];
      const data = await tenant.customer.findMany({
        orderBy: { createdAt: "desc" },
      });
      const osCounts = await tenant.serviceOrder.groupBy({
        by: ["customerId"],
        _count: true,
      });
      const osMap = new Map(osCounts.map(o => [o.customerId, o._count]));
      rows = data.map(item => [
        item.name,
        item.phone || "",
        item.email || "",
        String(osMap.get(item.id) || 0),
        item.createdAt.toISOString().slice(0, 10),
      ]);
      break;
    }
  }

  const csv = toCsv(headers, rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${tipo}-${month}.csv"`,
    },
  });
}
