import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { PaymentStatus } from "@/generated/prisma/client";
import { sendOSCompletedEmail } from "@/lib/email";

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

  const [hasAccess, financeActive, inventoryActive] = await Promise.all([
    checkModuleAccess(companyId, "service_orders"),
    checkModuleAccess(companyId, "finance"),
    checkModuleAccess(companyId, "inventory"),
  ]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const serviceOrder = await tenant.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: { id: true, name: true, quantity: true },
          },
        },
      },
      quote: {
        select: { id: true, number: true, status: true, total: true },
      },
      technician: {
        select: { id: true, name: true },
      },
      transactions: {
        select: {
          id: true,
          type: true,
          description: true,
          category: true,
          amount: true,
          dueDate: true,
          paidAt: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      stockMovements: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  if (!serviceOrder) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...serviceOrder,
    transactions: (serviceOrder.transactions || []).map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
    stockMovements: (serviceOrder.stockMovements || []).map((sm) => ({
      ...sm,
      quantity: Number(sm.quantity),
      previousQuantity: Number(sm.previousQuantity),
      newQuantity: Number(sm.newQuantity),
    })),
    financeActive,
    inventoryActive,
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

  const hasAccess = await checkModuleAccess(companyId, "service_orders");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.serviceOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
      { status: 404 }
    );
  }

  const body = await request.json();

  // Generate public token for portal access
  if (body.generatePublicToken && !existing.publicToken) {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(16).toString("base64url");
    const updated = await tenant.serviceOrder.update({
      where: { id },
      data: { publicToken: token },
    });
    return NextResponse.json({ publicToken: updated.publicToken });
  }

  // Mode 1: Status-only update
  if (body.status && !body.paymentAmount && !body.items) {
    const allowedTransitions: Record<string, string[]> = {
      RECEIVED: ["DIAGNOSIS", "IN_PROGRESS", "CANCELLED"],
      DIAGNOSIS: ["WAITING_APPROVAL", "IN_PROGRESS", "CANCELLED"],
      WAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
      WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["READY", "WAITING_PARTS", "CANCELLED"],
      READY: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[existing.status] || [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Transicao de status nao permitida: ${existing.status} -> ${body.status}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status: body.status };

    // Set completedAt when transitioning to READY
    if (body.status === "READY") {
      updateData.completedAt = new Date();
      updateData.finishedAt = new Date();
    }

    // Set completedAt when transitioning to DELIVERED
    if (body.status === "DELIVERED") {
      updateData.completedAt = new Date();
    }

    // Update paymentStatus to CANCELLED when cancelling
    if (body.status === "CANCELLED") {
      updateData.paymentStatus = PaymentStatus.CANCELLED;
    }

    const updated = await tenant.serviceOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, whatsapp: true, email: true },
        },
        items: true,
        quote: {
          select: { id: true, number: true, status: true, total: true },
        },
      },
    });

    // Send email notification when OS is finished or delivered
    if ((body.status === "READY" || body.status === "DELIVERED") && updated.customer?.email) {
      sendOSCompletedEmail(
        updated.customer.email,
        updated.customer.name,
        updated.code || `Nº ${updated.number}`
      ).catch((err) => console.error("Failed to send OS completed email:", err));
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = (session.user as Record<string, unknown>).name as string;
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "service_order",
      entityId: id,
      details: `Nº ${existing.number} - Status: ${body.status}`,
    });

    return NextResponse.json(updated);
  }

  // Mode 2: Payment update
  if (body.paymentAmount !== undefined && body.paymentAmount !== null) {
    const paymentAmount = parseFloat(body.paymentAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Valor do pagamento invalido" },
        { status: 400 }
      );
    }

    const currentPaid = Number(existing.paidAmount);
    const newPaidAmount = currentPaid + paymentAmount;
    const total = Number(existing.total);

    let newPaymentStatus: PaymentStatus;
    if (newPaidAmount >= total) {
      newPaymentStatus = PaymentStatus.PAID;
    } else if (newPaidAmount > 0) {
      newPaymentStatus = PaymentStatus.PARTIAL;
    } else {
      newPaymentStatus = PaymentStatus.PENDING;
    }

    const updated = await tenant.serviceOrder.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, whatsapp: true },
        },
        items: true,
        quote: {
          select: { id: true, number: true, status: true, total: true },
        },
      },
    });

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = (session.user as Record<string, unknown>).name as string;
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "service_order",
      entityId: id,
      details: `Nº ${existing.number} - Pagamento: ${newPaymentStatus} - Valor: R$ ${paymentAmount.toFixed(2)}`,
    });

    return NextResponse.json(updated);
  }

  // Mode 3: Full update with items (only if RECEIVED, DIAGNOSIS, WAITING_APPROVAL, IN_PROGRESS, or WAITING_PARTS)
  if (body.items) {
    if (!["RECEIVED", "DIAGNOSIS", "WAITING_APPROVAL", "IN_PROGRESS", "WAITING_PARTS"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Apenas OS abertas ou em andamento podem ser editadas" },
        { status: 400 }
      );
    }

    const {
      customerId,
      quoteId,
      problemDescription,
      serviceDescription,
      notes,
      items,
      equipmentName, equipmentBrand, equipmentModel, serialNumber, accessories,
      priority, expectedDeliveryDate, warrantyEnabled, warrantyTerms,
      internalNotes, customerNotes, paymentMethod, finalAmount,
    } = body;

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

    // Recalculate total from items
    const total = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );

    // Delete old items and create new ones
    await tenant.serviceOrderItem.deleteMany({
      where: { serviceOrderId: id },
    });

    // Recalculate payment status based on new total
    const currentPaid = Number(existing.paidAmount);
    let newPaymentStatus: PaymentStatus;
    if (currentPaid >= total) {
      newPaymentStatus = PaymentStatus.PAID;
    } else if (currentPaid > 0) {
      newPaymentStatus = PaymentStatus.PARTIAL;
    } else {
      newPaymentStatus = PaymentStatus.PENDING;
    }

    const updated = await tenant.serviceOrder.update({
      where: { id },
      data: {
        customerId,
        quoteId: quoteId || null,
        problemDescription: problemDescription?.trim() || null,
        serviceDescription: serviceDescription?.trim() || null,
        equipmentName: equipmentName?.trim() || null,
        equipmentBrand: equipmentBrand?.trim() || null,
        equipmentModel: equipmentModel?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        accessories: accessories?.trim() || null,
        priority: priority || undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        warrantyEnabled: warrantyEnabled ?? undefined,
        warrantyTerms: warrantyTerms?.trim() || null,
        internalNotes: internalNotes?.trim() || null,
        customerNotes: customerNotes?.trim() || null,
        paymentMethod: paymentMethod || undefined,
        finalAmount: finalAmount !== undefined ? parseFloat(finalAmount) : undefined,
        total,
        paymentStatus: newPaymentStatus,
        notes: notes?.trim() || null,
        items: {
          create: items.map(
            (item: { description: string; quantity: number; unitPrice: number; productId?: string }) => ({
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              productId: item.productId || null,
            })
          ),
        },
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, whatsapp: true },
        },
        items: true,
        quote: {
          select: { id: true, number: true, status: true, total: true },
        },
      },
    });

    const userId = (session.user as Record<string, unknown>).id as string;
    const userName = (session.user as Record<string, unknown>).name as string;
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "service_order",
      entityId: id,
      details: `Nº ${existing.number} - Itens atualizados`,
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

  const hasAccess = await checkModuleAccess(companyId, "service_orders");
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.serviceOrder.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
      { status: 404 }
    );
  }

  if (existing.status !== "RECEIVED") {
    return NextResponse.json(
      { error: "Apenas OS recebidas podem ser excluidas" },
      { status: 400 }
    );
  }

  await tenant.serviceOrder.delete({ where: { id } });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "DELETE",
    entity: "service_order",
    entityId: id,
    details: `Nº ${existing.number}`,
  });

  return NextResponse.json({ success: true });
}