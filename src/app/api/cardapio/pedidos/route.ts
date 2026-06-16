import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (statusFilter) {
    const statuses = statusFilter.split(",");
    where.status = { in: statuses };
  }

  const [orders, total] = await Promise.all([
    tenant.menuOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        table: { select: { name: true } },
      },
    }),
    tenant.menuOrder.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
