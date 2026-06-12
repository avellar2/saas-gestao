import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { CompanyStatus, QuoteStatus } from "@/generated/prisma/client";

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
  if (status && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
    where.status = status;
  }

  const quotes = await tenant.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, name: true },
      },
      items: true,
    },
  });

  return NextResponse.json(quotes);
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
  const currentCount = await tenant.quote.count();
  if (isTrialLimitReached(companyStatus, "quotes", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de orcamentos atingido. Faca upgrade do seu plano para adicionar mais orcamentos.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { customerId, description, validUntil, discount, notes, items } = body;

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

  // Get next sequential number for company
  const lastQuote = await tenant.quote.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = lastQuote ? lastQuote.number + 1 : 1;

  // Calculate subtotal from items
  const subtotal = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const discountValue = parseFloat(discount) || 0;
  const total = subtotal - discountValue;

  const quote = await tenant.quote.create({
    data: {
      companyId,
      customerId,
      number: nextNumber,
      description: description?.trim() || null,
      subtotal,
      discount: discountValue,
      total,
      validUntil: validUntil ? new Date(validUntil) : null,
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

  return NextResponse.json(quote, { status: 201 });
}