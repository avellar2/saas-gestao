import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { CompanyStatus } from "@/generated/prisma/client";

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
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>)
    .companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const skip = (page - 1) * limit;
  const sort = searchParams.get("sort") || "sortOrder_asc";

  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  const [items, total] = await Promise.all([
    tenant.menuItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    tenant.menuItem.count({ where }),
  ]);

  return NextResponse.json({
    items,
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

  const companyId = (session.user as Record<string, unknown>)
    .companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  const currentCount = await tenant.menuItem.count();
  if (isTrialLimitReached(companyStatus, "menu", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de itens no cardapio atingido. Faca upgrade do seu plano para adicionar mais itens.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description, price, category, imageUrl, active, sortOrder } =
    body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  if (price === undefined || price === null || isNaN(Number(price))) {
    return NextResponse.json(
      { error: "Preco e obrigatorio e deve ser um numero valido" },
      { status: 400 }
    );
  }

  const item = await tenant.menuItem.create({
    data: {
      name: name.trim(),
      companyId,
      description: description?.trim() || null,
      price: Number(price),
      category: category?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      active: active !== undefined ? active : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
    },
  });

  const userId = (session.user as Record<string, unknown>)
    .id as string;
  const userName = (session.user as Record<string, unknown>)
    .name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "menu",
    entityId: item.id,
    details: `Nome: ${item.name}`,
  });

  return NextResponse.json(item, { status: 201 });
}
