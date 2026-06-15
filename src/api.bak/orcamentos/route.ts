import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus, QuoteStatus } from "@/generated/prisma/client";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (status && Object.values(QuoteStatus).includes(status as QuoteStatus)) {
    where.status = status;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const quotes = await tenant.quote.findMany({
    where,
    orderBy,
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

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

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

  // Get next sequential number for company (transaction-safe)
  const [lastQuote] = await Promise.all([
    tenant.quote.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    }),
  ]);
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

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "quote",
    entityId: quote.id,
    details: `Nº ${quote.number} - Cliente: ${quote.customer?.name || "N/A"} - Total: R$ ${quote.total.toFixed(2)}`,
  });

  return NextResponse.json(quote, { status: 201 });
}