import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const tenant = tenantPrisma(companyId);

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "";
  const action = searchParams.get("action") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "30", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (entity) {
    where.entity = entity;
  }
  if (action) {
    where.action = action;
  }

  const [activities, total] = await Promise.all([
    tenant.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    tenant.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    activities,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
