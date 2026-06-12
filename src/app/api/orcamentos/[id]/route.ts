import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;
  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const quote = await tenant.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!quote) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(quote);
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
  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.quote.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json();

  // Mode 1: Status-only update
  if (body.status && !body.items && !body.convertToServiceOrder) {
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ["SENT", "EXPIRED"],
      SENT: ["APPROVED", "REJECTED", "EXPIRED"],
      APPROVED: ["EXPIRED"],
      REJECTED: [],
      EXPIRED: [],
    };

    const allowed = allowedTransitions[existing.status] || [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Transicao de status nao permitida: ${existing.status} -> ${body.status}` },
        { status: 400 }
      );
    }

    const updated = await tenant.quote.update({
      where: { id },
      data: { status: body.status },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    return NextResponse.json(updated);
  }

  // Mode 2: Convert approved quote to Service Order
  if (body.convertToServiceOrder) {
    if (existing.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Apenas orcamentos aprovados podem ser convertidos em OS" },
        { status: 400 }
      );
    }

    // Get next sequential SO number for company
    const lastSO = await tenant.serviceOrder.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const nextNumber = lastSO ? lastSO.number + 1 : 1;

    // Create ServiceOrder from quote
    const serviceOrder = await tenant.serviceOrder.create({
      data: {
        companyId,
        customerId: existing.customerId,
        quoteId: existing.id,
        number: nextNumber,
        status: "OPENED",
        problemDescription: existing.description,
        serviceDescription: existing.description,
        total: existing.total,
        paidAmount: 0,
        paymentStatus: "PENDING",
        notes: existing.notes,
        items: {
          create: existing.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    return NextResponse.json(serviceOrder, { status: 201 });
  }

  // Mode 3: Full update (only if DRAFT)
  if (body.items) {
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Apenas orcamentos em rascunho podem ser editados" },
        { status: 400 }
      );
    }

    const { customerId, description, validUntil, discount, notes, items } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Cliente e obrigatorio" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Pelo menos um item e obrigatorio" },
        { status: 400 }
      );
    }

    // Verify customer exists in tenant
    const customer = await tenant.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Cliente nao encontrado" },
        { status: 404 }
      );
    }

    // Recalculate subtotal and total
    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );

    const discountValue = parseFloat(discount) || 0;
    const total = subtotal - discountValue;

    // Delete old items and create new ones
    await tenant.quoteItem.deleteMany({
      where: { quoteId: id },
    });

    const updated = await tenant.quote.update({
      where: { id },
      data: {
        customerId,
        description: description?.trim() || null,
        subtotal,
        discount: discountValue,
        total,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes?.trim() || null,
        items: {
          create: items.map(
            (item: { description: string; quantity: number; unitPrice: number }) => ({
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })
          ),
        },
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { error: "Requisicao invalida" },
    { status: 400 }
  );
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
  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Orcamento nao encontrado" },
      { status: 404 }
    );
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Apenas orcamentos em rascunho podem ser excluidos" },
      { status: 400 }
    );
  }

  await tenant.quote.delete({ where: { id } });

  return NextResponse.json({ success: true });
}