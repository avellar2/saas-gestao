import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { restaurantTableUpdateSchema } from "@/lib/validations";

async function checkModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.restaurantTable.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = restaurantTableUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await tenant.restaurantTable.update({
    where: { id },
    data: parsed.data,
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  const details = parsed.data.active === false
    ? `Mesa: ${existing.name} desativada`
    : `Mesa: ${existing.name}`;

  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "restaurant_table",
    entityId: id,
    details,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "menu");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.restaurantTable.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Mesa não encontrada" }, { status: 404 });
  }

  await tenant.restaurantTable.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "restaurant_table",
    entityId: id,
    details: `Mesa: ${existing.name}`,
  });

  return NextResponse.json({ success: true });
}
