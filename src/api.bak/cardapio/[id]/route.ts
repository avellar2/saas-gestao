import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

async function checkModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const item = await tenant.menuItem.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
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

  if (price !== undefined && isNaN(Number(price))) {
    return NextResponse.json(
      { error: "Preco invalido" },
      { status: 400 }
    );
  }

  const updated = await tenant.menuItem.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      price: price !== undefined ? Number(price) : existing.price,
      category: category?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      active: active !== undefined ? active : existing.active,
      sortOrder:
        sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "menu",
    entityId: id,
    details: `Nome: ${existing.name}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.menuItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.menuItem.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "menu",
    entityId: id,
    details: `Nome: ${existing.name}`,
  });

  return NextResponse.json({ success: true });
}
