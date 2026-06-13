import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
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

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  // Module guard check
  const hasAccess = await checkModuleAccess(companyId, "catalog");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const item = await tenant.catalogItem.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...item,
    price: Number(item.price),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "catalog");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.catalogItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
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

  const updated = await tenant.catalogItem.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      price: price !== undefined ? Number(price) : undefined,
      category: category?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      active: active !== undefined ? active : undefined,
    } as Parameters<typeof tenant.catalogItem.update>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "catalog",
    entityId: id,
    details: `Nome: ${existing.name}`,
  });

  return NextResponse.json({
    ...updated,
    price: Number(updated.price),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "catalog");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.catalogItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Item nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.catalogItem.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "catalog",
    entityId: id,
    details: `Nome: ${existing.name}`,
  });

  return NextResponse.json({ success: true });
}
