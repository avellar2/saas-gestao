import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";

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
  const hasAccess = await checkModuleAccess(companyId, "customers");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "createdAt_desc";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [customers, total] = await Promise.all([
    tenant.customer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.customer.count({ where }),
  ]);

  return NextResponse.json({
    customers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "customers");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  // Check trial limit
  const currentCount = await tenant.customer.count();
  if (isTrialLimitReached(companyStatus, "customers", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de clientes atingido. Faça upgrade do seu plano para adicionar mais clientes.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, phone, whatsapp, email, document, address, notes } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  const customer = await tenant.customer.create({
    data: {
      name: name.trim(),
      companyId,
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      document: document?.trim() || null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
    } as Parameters<typeof tenant.customer.create>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "customer",
    entityId: customer.id,
    details: `Nome: ${customer.name}`,
  });

  return NextResponse.json(customer, { status: 201 });
}