import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "reports");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);

  const [
    totalCustomers,
    newCustomersThisMonth,
    totalQuotes,
    draftQuotes,
    sentQuotes,
    approvedQuotes,
    rejectedQuotes,
    quotesValueAgg,
    totalServiceOrders,
    openedOS,
    inProgressOS,
    finishedOS,
    deliveredOS,
    cancelledOS,
    osValueAgg,
    receivableAgg,
    payableAgg,
    pendingFinancial,
    paidFinancial,
    totalProducts,
    allProducts,
    totalAppointments,
    todayAppointments,
    scheduledAppointments,
  ] = await Promise.all([
    tenant.customer.count(),
    tenant.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    tenant.quote.count(),
    tenant.quote.count({ where: { status: "DRAFT" } }),
    tenant.quote.count({ where: { status: "SENT" } }),
    tenant.quote.count({ where: { status: "APPROVED" } }),
    tenant.quote.count({ where: { status: "REJECTED" } }),
    tenant.quote.aggregate({ _sum: { total: true } }),
    tenant.serviceOrder.count(),
    tenant.serviceOrder.count({ where: { status: "OPENED" } }),
    tenant.serviceOrder.count({ where: { status: "IN_PROGRESS" } }),
    tenant.serviceOrder.count({ where: { status: "FINISHED" } }),
    tenant.serviceOrder.count({ where: { status: "DELIVERED" } }),
    tenant.serviceOrder.count({ where: { status: "CANCELLED" } }),
    tenant.serviceOrder.aggregate({ _sum: { total: true } }),
    tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "RECEIVABLE" },
    }),
    tenant.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "PAYABLE" },
    }),
    tenant.financialTransaction.count({ where: { status: "PENDING" } }),
    tenant.financialTransaction.count({ where: { status: "PAID" } }),
    tenant.product.count(),
    tenant.product.findMany({ select: { quantity: true, minStock: true } }),
    tenant.appointment.count(),
    tenant.appointment.count({
      where: { dateTime: { gte: startOfToday, lt: endOfToday } },
    }),
    tenant.appointment.count({ where: { status: "SCHEDULED" } }),
  ]);

  const lowStockProducts = allProducts.filter(
    (p) => Number(p.quantity) <= Number(p.minStock)
  ).length;

  const totalReceivable = Number(receivableAgg._sum.amount) || 0;
  const totalPayable = Number(payableAgg._sum.amount) || 0;
  const quotesTotalValue = Number(quotesValueAgg._sum.total) || 0;
  const osTotalValue = Number(osValueAgg._sum.total) || 0;

  return NextResponse.json({
    customers: {
      total: totalCustomers,
      newThisMonth: newCustomersThisMonth,
    },
    quotes: {
      total: totalQuotes,
      draft: draftQuotes,
      sent: sentQuotes,
      approved: approvedQuotes,
      rejected: rejectedQuotes,
      totalValue: quotesTotalValue,
    },
    serviceOrders: {
      total: totalServiceOrders,
      open: openedOS,
      inProgress: inProgressOS,
      finished: finishedOS,
      delivered: deliveredOS,
      cancelled: cancelledOS,
      totalValue: osTotalValue,
    },
    financial: {
      totalReceivable,
      totalPayable,
      balance: totalReceivable - totalPayable,
      pending: pendingFinancial,
      paid: paidFinancial,
    },
    inventory: {
      totalProducts,
      lowStock: lowStockProducts,
    },
    appointments: {
      total: totalAppointments,
      today: todayAppointments,
      scheduled: scheduledAppointments,
    },
  });
}
