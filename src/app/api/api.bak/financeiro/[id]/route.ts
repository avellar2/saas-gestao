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

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const transaction = await tenant.financialTransaction.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: "Transacao nao encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(transaction);
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

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.financialTransaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Transacao nao encontrada" },
      { status: 404 }
    );
  }

  const body = await request.json();

  // Mark as paid
  if (body.status === "PAID") {
    const updated = await tenant.financialTransaction.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      } as Parameters<typeof tenant.financialTransaction.update>[0]["data"],
    });

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = (session.user as Record<string, unknown>).name as string;
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "financial",
      entityId: id,
      details: `Descricao: ${existing.description} - Status: PAID`,
    });

    return NextResponse.json(updated);
  }

  const { type, description, category, amount, dueDate, customerId, notes } = body;

  if (type && !["RECEIVABLE", "PAYABLE"].includes(type)) {
    return NextResponse.json(
      { error: "Tipo invalido. Use RECEIVABLE ou PAYABLE" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (type) data.type = type;
  if (description !== undefined) data.description = description.trim();
  if (category !== undefined) data.category = category?.trim() || null;
  if (amount !== undefined) data.amount = Number(amount);
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (customerId !== undefined) data.customerId = customerId || null;
  if (notes !== undefined) data.notes = notes?.trim() || null;

  const updated = await tenant.financialTransaction.update({
    where: { id },
    data: data as Parameters<typeof tenant.financialTransaction.update>[0]["data"],
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "financial",
    entityId: id,
    details: `Descricao: ${existing.description}`,
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

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.financialTransaction.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Transacao nao encontrada" },
      { status: 404 }
    );
  }

  await tenant.financialTransaction.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "financial",
    entityId: id,
    details: `Descricao: ${existing.description}`,
  });

  return NextResponse.json({ success: true });
}
