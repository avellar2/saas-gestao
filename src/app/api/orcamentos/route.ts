import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";
import { quoteSchema } from "@/lib/validations";
import { findCustomerInCompany, notFoundResponse } from "@/lib/tenant-guard";

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

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [quotes, total] = await Promise.all([
    tenant.quote.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } } },
    }),
    tenant.quote.count({ where }),
  ]);

  const serialized = quotes.map((q) => ({
    ...q,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    total: Number(q.total),
  }));

  return NextResponse.json({ quotes: serialized, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>).companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  const currentCount = await tenant.quote.count();
  if (isTrialLimitReached(companyStatus, "quotes", currentCount)) {
    return NextResponse.json(
      { error: "Limite de orcamentos atingido. Faca upgrade do seu plano para adicionar mais." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const result = quoteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || "Dados invalidos" },
      { status: 400 }
    );
  }

  const { customerId, description, items, discount, notes, validUntil } = result.data;

  // P23 fix: validar customerId pertence à empresa (e buscar nome para log)
  const customer = await tenant.customer.findUnique({ where: { id: customerId } });
  if (!customer) return notFoundResponse("Cliente");

  const lastQuote = await tenant.quote.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const nextNumber = lastQuote ? lastQuote.number + 1 : 1;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - (discount || 0);

  const quote = await tenant.quote.create({
    data: {
      companyId,
      customerId,
      number: nextNumber,
      status: "DRAFT",
      description: description?.trim() || null,
      subtotal,
      discount: discount || 0,
      total,
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes?.trim() || null,
      items: {
        create: items.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
      items: true,
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "CREATE", entity: "quote", entityId: quote.id, details: `Nº ${quote.number} - Cliente: ${customer.name}` });

  return NextResponse.json(
    { ...quote, subtotal: Number(quote.subtotal), discount: Number(quote.discount), total: Number(quote.total) },
    { status: 201 }
  );
}