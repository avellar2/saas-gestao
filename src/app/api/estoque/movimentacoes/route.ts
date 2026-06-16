import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
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

  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") || "";
  const type = searchParams.get("type") || "";
  const reason = searchParams.get("reason") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const origin = searchParams.get("origin") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "30", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (productId) where.productId = productId;
  if (type && ["IN", "OUT", "ADJUSTMENT"].includes(type)) where.type = type;
  if (reason) where.reason = reason;

  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate + "T23:59:59.999");
    where.createdAt = createdAt;
  }

  if (origin === "os") {
    where.serviceOrderId = { not: null };
  } else if (origin === "manual") {
    where.serviceOrderId = null;
  }

  const [movements, total] = await Promise.all([
    tenant.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        product: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    tenant.stockMovement.count({ where }),
  ]);

  const serialized = movements.map((m) => ({
    ...m,
    quantity: Number(m.quantity),
    previousQuantity: Number(m.previousQuantity),
    newQuantity: Number(m.newQuantity),
  }));

  return NextResponse.json({
    movements: serialized,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
