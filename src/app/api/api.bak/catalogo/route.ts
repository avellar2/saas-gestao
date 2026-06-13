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
  const hasAccess = await checkModuleAccess(companyId, "catalog");
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
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [items, total] = await Promise.all([
    tenant.catalogItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.catalogItem.count({ where }),
  ]);

  const serialized = items.map((item) => ({
    ...item,
    price: Number(item.price),
  }));

  return NextResponse.json({
    items: serialized,
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
  const hasAccess = await checkModuleAccess(companyId, "catalog");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  // Check trial limit
  const currentCount = await tenant.catalogItem.count();
  if (isTrialLimitReached(companyStatus, "catalog", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de itens no catalogo atingido. Faça upgrade do seu plano para adicionar mais itens.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description, price, category, imageUrl, active } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  if (price === undefined || price === null || Number(price) < 0) {
    return NextResponse.json(
      { error: "Preco obrigatorio e deve ser maior ou igual a zero" },
      { status: 400 }
    );
  }

  const item = await tenant.catalogItem.create({
    data: {
      name: name.trim(),
      companyId,
      description: description?.trim() || null,
      price: Number(price),
      category: category?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      active: active !== undefined ? active : true,
    } as Parameters<typeof tenant.catalogItem.create>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "catalog",
    entityId: item.id,
    details: `Nome: ${item.name}`,
  });

  return NextResponse.json(
    {
      ...item,
      price: Number(item.price),
    },
    { status: 201 }
  );
}
