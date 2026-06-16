import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sendOSCompletedEmail } from "@/lib/email";
import { closeServiceOrderSchema } from "@/lib/validations";
import { ALLOWED_CLOSE_TRANSITIONS } from "@/lib/os-status";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const [hasAccess, financeActive] = await Promise.all([
    checkModuleAccess(companyId, "service_orders"),
    checkModuleAccess(companyId, "finance"),
  ]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Modulo nao ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Ordem de servico nao encontrada" },
      { status: 404 }
    );
  }

  // Validate current status allows closing
  if (!["IN_PROGRESS", "READY", "DELIVERED"].includes(existing.status)) {
    return NextResponse.json(
      { error: `Status ${existing.status} nao permite fechamento` },
      { status: 400 }
    );
  }

  const body = await request.json();

  // Parse and validate with Zod
  const parsed = closeServiceOrderSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Dados invalidos";
    return NextResponse.json({ error: firstError, fieldErrors: errors }, { status: 422 });
  }

  const data = parsed.data;

  // Validate transition is allowed
  const allowed = ALLOWED_CLOSE_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(data.finalStatus)) {
    return NextResponse.json(
      { error: `Transicao nao permitida: ${existing.status} -> ${data.finalStatus}` },
      { status: 400 }
    );
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    status: data.finalStatus,
    finalAmount: data.finalAmount,
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod || null,
    completedAt: new Date(data.completedAt),
    serviceDescription: data.serviceDescription?.trim() || null,
    customerNotes: data.customerNotes?.trim() || null,
    warrantyEnabled: data.warrantyEnabled,
  };

  // finishedAt: only set for DELIVERED or COMPLETED
  if (data.finalStatus === "DELIVERED" || data.finalStatus === "COMPLETED") {
    updateData.finishedAt = new Date();
  }

  // Warranty fields
  if (data.warrantyEnabled) {
    updateData.warrantyStartDate = data.warrantyStartDate ? new Date(data.warrantyStartDate) : null;
    updateData.warrantyEndDate = data.warrantyEndDate ? new Date(data.warrantyEndDate) : null;
    updateData.warrantyTerms = data.warrantyTerms?.trim() || null;
  } else {
    updateData.warrantyStartDate = null;
    updateData.warrantyEndDate = null;
    updateData.warrantyTerms = null;
  }

  // Payment: if PAID, set paidAmount = finalAmount
  if (data.paymentStatus === "PAID") {
    updateData.paidAmount = data.finalAmount;
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

  // ActivityLog
  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;
  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "service_order",
    entityId: id,
    details: `Nº ${existing.number} - Finalizada: ${data.finalStatus}`,
  });

  // Email notification (fire-and-forget)
  if (data.sendEmail && updated.customer?.email) {
    sendOSCompletedEmail(
      updated.customer.email,
      updated.customer.name,
      updated.code || `Nº ${updated.number}`
    ).catch((err) => console.error("Failed to send OS completed email:", err));
  }

  // ── Finance Module Integration (Etapa 5) ──
  if (financeActive && data.finalAmount > 0) {
    try {
      const osCode = updated.code || `OS-${String(updated.number).padStart(4, "0")}`;
      const finalAmount = data.finalAmount;

      const existingTx = await tenant.financialTransaction.findFirst({
        where: { serviceOrderId: id },
      });

      if (data.paymentStatus === "CANCELLED") {
        // Cancel existing transaction if any
        if (existingTx) {
          await tenant.financialTransaction.update({
            where: { id: existingTx.id },
            data: { status: "CANCELLED" },
          });

          await logActivity({
            tenant, userId, userName,
            action: "UPDATE",
            entity: "financial",
            entityId: existingTx.id,
            details: `Receita financeira cancelada a partir da OS ${osCode}`,
          });
        }
      } else {
        const isPaid = data.paymentStatus === "PAID";
        const isPartial = data.paymentStatus === "PARTIAL";

        const txData: Record<string, unknown> = {
          type: "RECEIVABLE",
          description: isPaid
            ? `Receita da OS ${osCode}`
            : isPartial
              ? `Pagamento parcial da OS ${osCode}`
              : `Conta a receber da OS ${osCode}`,
          category: "Ordem de Serviço",
          amount: finalAmount,
          customerId: updated.customerId,
          status: isPaid ? "PAID" : "PENDING",
        };

        if (isPaid) {
          txData.paidAt = updated.completedAt || new Date();
        } else {
          txData.dueDate = updated.completedAt || new Date();
        }

        if (isPartial) {
          txData.notes = `Pagamento parcial registrado na OS. Valor pago: R$ ${Number(updated.paidAmount).toFixed(2)} de R$ ${finalAmount.toFixed(2)}`;
        }

        if (existingTx) {
          await tenant.financialTransaction.update({
            where: { id: existingTx.id },
            data: txData as any,
          });
        } else {
          await tenant.financialTransaction.create({
            data: { ...txData, serviceOrderId: id } as any,
          });
        }

        await logActivity({
          tenant, userId, userName,
          action: existingTx ? "UPDATE" : "CREATE",
          entity: "financial",
          entityId: existingTx?.id ?? id,
          details: existingTx
            ? `Receita financeira atualizada a partir da OS ${osCode}`
            : `Receita financeira criada a partir da OS ${osCode}`,
        });
      }
    } catch (financeErr) {
      console.error("Failed to create/update financial transaction for OS:", financeErr);
      // Do NOT fail the OS close — the OS was closed successfully
    }
  }

  // Re-fetch OS with transactions for the response
  const refreshedOS = await tenant.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, whatsapp: true, email: true },
      },
      items: true,
      quote: {
        select: { id: true, number: true, status: true, total: true },
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
    },
  });

  const responseData = {
    ...refreshedOS,
    transactions: (refreshedOS?.transactions || []).map((t: any) => ({
      ...t,
      amount: Number(t.amount),
    })),
    financeActive,
  };

  return NextResponse.json(responseData);
}