import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { isTrialLimitReached } from "@/lib/company-limits";
import { logActivity } from "@/lib/activity-log";
import { restaurantTableSchema } from "@/lib/validations";
import { generateTableToken } from "@/lib/menu-helpers";
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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const tables = await tenant.restaurantTable.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          orders: {
            where: { status: { in: ["RECEIVED", "PREPARING", "READY"] } },
          },
        },
      },
    },
  });

  return NextResponse.json({ tables });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const companyStatus = (session.user as Record<string, unknown>).companyStatus as CompanyStatus;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  // Verifica trial limit
  const currentCount = await tenant.restaurantTable.count();
  if (isTrialLimitReached(companyStatus, "restaurantTables", currentCount)) {
    return NextResponse.json(
      { error: "Limite de mesas atingido. Faça upgrade do seu plano." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = restaurantTableSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const table = await tenant.restaurantTable.create({
    data: {
      name: parsed.data.name,
      token: generateTableToken(),
      active: parsed.data.active ?? true,
      companyId,
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "CREATE",
    entity: "restaurant_table",
    entityId: table.id,
    details: `Mesa: ${table.name}`,
  });

  return NextResponse.json(table, { status: 201 });
}
