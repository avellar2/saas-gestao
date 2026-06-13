import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { QuoteStatus } from "@/generated/prisma/client";
import { quoteUpdateSchema } from "@/lib/validations";

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

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const quote = await tenant.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Orcamento nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...quote,
    subtotal: Number(quote.subtotal),
    discount: Number(quote.discount),
    total: Number(quote.total),
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

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.quote.findUnique({ where: { id }, include: { items: true } });
  if (!existing) {
    return NextResponse.json({ error: "Orcamento nao encontrado" }, { status: 404 });
  }

  const body = await request.json();

  // Status-only update
  if (body.status && !body.items) {
    const allowedStatuses: QuoteStatus[] = ["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"];
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status invalido" }, { status: 400 });
    }

    const updated = await tenant.quote.update({
      where: { id },
      data: { status: body.status },
      include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } }, items: true },
    });

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = (session.user as Record<string, unknown>).name as string;
    await logActivity({ tenant, userId, userName, action: "UPDATE", entity: "quote", entityId: id, details: `Nº ${existing.number} - Status: ${body.status}` });

    return NextResponse.json({ ...updated, subtotal: Number(updated.subtotal), discount: Number(updated.discount), total: Number(updated.total) });
  }

  const result = quoteUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || "Dados invalidos" }, { status: 400 });
  }

  const { customerId, items, discount, notes, validUntil } = result.data;

  if (customerId) {
    const customer = await tenant.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
    }
  }

  let subtotal = Number(existing.subtotal);
  let total = Number(existing.total);

  if (items) {
    subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    total = subtotal - (discount ?? Number(existing.discount));
    await tenant.quoteItem.deleteMany({ where: { quoteId: id } });
  }

  const updated = await tenant.quote.update({
    where: { id },
    data: {
      ...(customerId && { customerId }),
      ...(items && {
        items: {
          create: items.map((item) => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      }),
      ...(discount !== undefined && { discount }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      subtotal,
      total,
    },
    include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } }, items: true },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "UPDATE", entity: "quote", entityId: id, details: `Nº ${existing.number} - Itens atualizados` });

  return NextResponse.json({ ...updated, subtotal: Number(updated.subtotal), discount: Number(updated.discount), total: Number(updated.total) });
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

  const hasAccess = await checkModuleAccess(companyId, "quotes");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Orcamento nao encontrado" }, { status: 404 });
  }

  if (existing.status !== "DRAFT" && existing.status !== "EXPIRED") {
    return NextResponse.json({ error: "Apenas orcamentos em rascunho ou expirados podem ser excluidos" }, { status: 400 });
  }

  await tenant.quote.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({ tenant, userId, userName, action: "DELETE", entity: "quote", entityId: id, details: `Nº ${existing.number}` });

  return NextResponse.json({ success: true });
}