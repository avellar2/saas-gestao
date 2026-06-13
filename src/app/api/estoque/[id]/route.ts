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
  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const product = await tenant.product.findUnique({
    where: { id },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Produto nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...product,
    quantity: Number(product.quantity),
    minStock: Number(product.minStock),
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    salePrice: Number(product.salePrice),
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

  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Produto nao encontrado" },
      { status: 404 }
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

  const updated = await tenant.product.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      sku: sku?.trim() || null,
      category: category?.trim() || null,
      quantity: quantity !== undefined ? quantity : undefined,
      minStock: minStock !== undefined ? minStock : undefined,
      costPrice: costPrice !== undefined ? costPrice : undefined,
      salePrice: salePrice !== undefined ? salePrice : undefined,
    } as Parameters<typeof tenant.product.update>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "product",
    entityId: id,
    details: `Nome: ${existing.name} - SKU: ${existing.sku || "N/A"}`,
  });

  return NextResponse.json({
    ...updated,
    quantity: Number(updated.quantity),
    minStock: Number(updated.minStock),
    costPrice: updated.costPrice ? Number(updated.costPrice) : null,
    salePrice: Number(updated.salePrice),
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

  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Produto nao encontrado" },
      { status: 404 }
    );
  }

  await tenant.product.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "product",
    entityId: id,
    details: `Nome: ${existing.name} - SKU: ${existing.sku || "N/A"}`,
  });

  return NextResponse.json({ success: true });
}