import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { CompanyStatus, ServiceOrderStatus } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (
    status &&
    Object.values(ServiceOrderStatus).includes(status as ServiceOrderStatus)
  ) {
    where.status = status;
  }

  const serviceOrders = await tenant.serviceOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, name: true },
      },
      items: true,
    },
  });

  return NextResponse.json(serviceOrders);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  // Check trial limit
  const currentCount = await tenant.serviceOrder.count();
  if (isTrialLimitReached(companyStatus, "serviceOrders", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de ordens de servico atingido. Faca upgrade do seu plano para adicionar mais.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { customerId, quoteId, problemDescription, serviceDescription, notes, items } =
    body;

  if (!customerId) {
    return NextResponse.json(
      { error: "Cliente e obrigatorio" },
      { status: 400 }
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Pelo menos um item e obrigatorio" },
      { status: 400 }
    );
  }

  // Verify customer exists in tenant
  const customer = await tenant.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  // Verify quote exists and is approved if linking
  if (quoteId) {
    const quote = await tenant.quote.findUnique({
      where: { id: quoteId },
    });
    if (!quote) {
      return NextResponse.json(
        { error: "Orcamento nao encontrado" },
        { status: 404 }
      );
    }
  }

  // Get next sequential number for company
  const lastSO = await tenant.serviceOrder.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = lastSO ? lastSO.number + 1 : 1;

  // Calculate total from items
  const total = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const serviceOrder = await tenant.serviceOrder.create({
    data: {
      companyId,
      customerId,
      quoteId: quoteId || null,
      number: nextNumber,
      status: "OPENED",
      problemDescription: problemDescription?.trim() || null,
      serviceDescription: serviceDescription?.trim() || null,
      total,
      paidAmount: 0,
      paymentStatus: "PENDING",
      openedAt: new Date(),
      notes: notes?.trim() || null,
      items: {
        create: items.map(
          (item: { description: string; quantity: number; unitPrice: number }) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })
        ),
      },
    },
    include: {
      customer: {
        select: { id: true, name: true },
      },
      items: true,
    },
  });

  return NextResponse.json(serviceOrder, { status: 201 });
}