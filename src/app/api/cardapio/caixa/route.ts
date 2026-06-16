import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { PAYMENT_METHOD_LABELS } from "@/lib/menu-helpers";

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

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const start = new Date(`${dateParam}T00:00:00.000`);
  const end = new Date(`${dateParam}T23:59:59.999`);

  // Pedidos entregues no período (filtrados por paidAt)
  const deliveredOrders = await tenant.menuOrder.findMany({
    where: {
      status: "DELIVERED",
      paidAt: { gte: start, lte: end },
    },
    include: {
      items: true,
      table: { select: { name: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  // Pedidos cancelados no período (filtrados por updatedAt, já que não têm paidAt)
  const cancelledOrders = await tenant.menuOrder.findMany({
    where: {
      status: "CANCELLED",
      updatedAt: { gte: start, lte: end },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Totais
  const totalSold = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );

  // Agrupamento por forma de pagamento
  const byPaymentMethod: Record<string, number> = {};
  for (const order of deliveredOrders) {
    const method = order.paymentMethod || "UNINFORMED";
    byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(order.total);
  }

  // Ticket médio
  const deliveredCount = deliveredOrders.length;
  const averageTicket = deliveredCount > 0 ? totalSold / deliveredCount : 0;

  // Serializa os pedidos para retornar como number
  const serializedDelivered = deliveredOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    orderType: o.orderType,
    paymentMethod: o.paymentMethod,
    total: Number(o.total),
    customerName: o.customerName,
    table: o.table ? { name: o.table.name } : null,
    paidAt: o.paidAt?.toISOString() || null,
  }));

  const serializedCancelled = cancelledOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.total),
    updatedAt: o.updatedAt.toISOString(),
  }));

  // Monta o resumo por forma de pagamento com labels
  const paymentSummary = Object.entries(byPaymentMethod).map(([method, amount]) => ({
    method,
    label: PAYMENT_METHOD_LABELS[method] || (method === "UNINFORMED" ? "Não informado" : method),
    amount,
    percentage: totalSold > 0 ? Math.round((amount / totalSold) * 100) : 0,
  }));

  return NextResponse.json({
    date: dateParam,
    summary: {
      totalSold,
      deliveredCount,
      cancelledCount: cancelledOrders.length,
      averageTicket: Math.round(averageTicket * 100) / 100,
      byPaymentMethod: paymentSummary,
    },
    orders: serializedDelivered,
    cancelled: serializedCancelled,
  });
}
