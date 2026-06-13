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
  const hasAccess = await checkModuleAccess(companyId, "inventory");
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
  const lowStock = searchParams.get("lowStock") === "true";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split("_");
  const orderBy = { [sortField]: sortDir };

  // Fetch all matching products, then apply lowStock and pagination in-memory
  // (Prisma does not support comparing two fields in where)
  const allProducts = await tenant.product.findMany({
    where,
    orderBy,
  });

  let filtered = allProducts;
  if (lowStock) {
    filtered = allProducts.filter(
      (p) => Number(p.quantity) <= Number(p.minStock)
    );
  }

  const total = filtered.length;
  const products = filtered.slice(skip, skip + limit);

  const serialized = products.map((p) => ({
    ...p,
    quantity: Number(p.quantity),
    minStock: Number(p.minStock),
    costPrice: p.costPrice ? Number(p.costPrice) : null,
    salePrice: Number(p.salePrice),
  }));

  return NextResponse.json({
    products: serialized,
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
  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const companyStatus = (session.user as Record<string, unknown>)
    .companyStatus as CompanyStatus;
  const tenant = tenantPrisma(companyId);

  // Check trial limit
  const currentCount = await tenant.product.count();
  if (isTrialLimitReached(companyStatus, "inventory", currentCount)) {
    return NextResponse.json(
      {
        error:
          "Limite de produtos atingido. Faça upgrade do seu plano para adicionar mais produtos.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description, sku, category, quantity, minStock, costPrice, salePrice } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome e obrigatorio" },
      { status: 400 }
    );
  }

  const product = await tenant.product.create({
    data: {
      name: name.trim(),
      companyId,
      description: description?.trim() || null,
      sku: sku?.trim() || null,
      category: category?.trim() || null,
      quantity: quantity || 0,
      minStock: minStock || 0,
      costPrice: costPrice || null,
      salePrice: salePrice || 0,
    } as Parameters<typeof tenant.product.create>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "product",
    entityId: product.id,
    details: `Nome: ${product.name} - SKU: ${product.sku || "N/A"}`,
  });

  return NextResponse.json(
    {
      ...product,
      quantity: Number(product.quantity),
      minStock: Number(product.minStock),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      salePrice: Number(product.salePrice),
    },
    { status: 201 }
  );
}