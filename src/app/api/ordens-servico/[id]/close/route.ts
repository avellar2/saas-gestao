import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { sendOSCompletedEmail } from "@/lib/email";
import { closeServiceOrderSchema } from "@/lib/validations";
import { ALLOWED_CLOSE_TRANSITIONS } from "@/lib/os-status";
import {
  deductStockForServiceOrder,
  InsufficientStockError,
} from "@/lib/stock-deduction";

async function checkModuleAccess(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
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
  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;

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

  const existing = await tenant.serviceOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      items: {
        include: { product: { select: { id: true, name: true, quantity: true } } },
      },
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
    return NextResponse.json(
      { error: firstError, fieldErrors: errors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Validate transition is allowed
  const allowed = ALLOWED_CLOSE_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(data.finalStatus)) {
    return NextResponse.json(
      {
        error: `Transicao nao permitida: ${existing.status} -> ${data.finalStatus}`,
      },
      { status: 400 }
    );
  }

  // ────────────────────────────────────────────────────────
  // TRANSACTION ATÔMICA: fechamento da OS + baixa de estoque
  // ────────────────────────────────────────────────────────
  const osCode = existing.code || `OS-${String(existing.number).padStart(4, "0")}`;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Garante o contexto RLS
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_company_id', $1, true)`,
        companyId
      );

      // 2. Atualiza a OS (só se existir e ainda não foi baixada)
      const osUpdatePayload: Record<string, unknown> = {
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
      if (
        data.finalStatus === "DELIVERED" ||
        data.finalStatus === "COMPLETED"
      ) {
        osUpdatePayload.finishedAt = new Date();
      }

      // Warranty fields
      if (data.warrantyEnabled) {
        osUpdatePayload.warrantyStartDate = data.warrantyStartDate
          ? new Date(data.warrantyStartDate)
          : null;
        osUpdatePayload.warrantyEndDate = data.warrantyEndDate
          ? new Date(data.warrantyEndDate)
          : null;
        osUpdatePayload.warrantyTerms = data.warrantyTerms?.trim() || null;
      } else {
        osUpdatePayload.warrantyStartDate = null;
        osUpdatePayload.warrantyEndDate = null;
        osUpdatePayload.warrantyTerms = null;
      }

      // Payment: if PAID, set paidAmount = finalAmount
      if (data.paymentStatus === "PAID") {
        osUpdatePayload.paidAmount = data.finalAmount;
      }

      const osUpdate = await tx.serviceOrder.updateMany({
        where: { id, companyId },
        data: osUpdatePayload,
      });

      if (osUpdate.count === 0) {
        throw new Error("Ordem de servico nao encontrada");
      }

      // 3. Baixa de estoque (se inventory ativo)
      if (inventoryActive) {
        // Verifica se já houve baixa anterior
        const currentOS = await tx.serviceOrder.findUnique({
          where: { id },
          select: { inventoryDeductedAt: true },
        });

        if (currentOS && !currentOS.inventoryDeductedAt) {
          await deductStockForServiceOrder(tx, {
            companyId,
            serviceOrderId: id,
            items: existing.items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
            })),
            osCode,
            userId,
          });

          // Marca inventoryDeductedAt
          await tx.serviceOrder.update({
            where: { id },
            data: { inventoryDeductedAt: new Date() },
          });
        }
      }
    });

    // ── Transaction commitida com sucesso ──

    // ActivityLog
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "service_order",
      entityId: id,
      details: `Nº ${existing.number} - Finalizada: ${data.finalStatus}${
        inventoryActive ? " (estoque baixado)" : ""
      }`,
    });

    // Email notification (fire-and-forget)
    if (data.sendEmail && existing.customer?.email) {
      sendOSCompletedEmail(
        existing.customer.email,
        existing.customer.name,
        osCode
      ).catch((err) => console.error("Failed to send OS completed email:", err));
    }

    // ── Finance Module Integration (Etapa 5) ──
    if (financeActive && data.finalAmount > 0) {
      try {
        const existingTx = await tenant.financialTransaction.findFirst({
          where: { serviceOrderId: id },
        });

        if (data.paymentStatus === "CANCELLED") {
          if (existingTx) {
            await tenant.financialTransaction.update({
              where: { id: existingTx.id },
              data: { status: "CANCELLED" },
            });

            await logActivity({
              tenant,
              userId,
              userName,
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
            amount: data.finalAmount,
            customerId: existing.customerId,
            status: isPaid ? "PAID" : "PENDING",
          };

          if (isPaid) {
            txData.paidAt = data.completedAt
              ? new Date(data.completedAt)
              : new Date();
          } else {
            txData.dueDate = data.completedAt
              ? new Date(data.completedAt)
              : new Date();
          }

          if (isPartial) {
            txData.notes = `Pagamento parcial registrado na OS. Valor pago: R$ ${Number(existing.paidAmount).toFixed(2)} de R$ ${data.finalAmount.toFixed(2)}`;
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
            tenant,
            userId,
            userName,
            action: existingTx ? "UPDATE" : "CREATE",
            entity: "financial",
            entityId: existingTx?.id ?? id,
            details: existingTx
              ? `Receita financeira atualizada a partir da OS ${osCode}`
              : `Receita financeira criada a partir da OS ${osCode}`,
          });
        }
      } catch (financeErr) {
        console.error(
          "Failed to create/update financial transaction for OS:",
          financeErr
        );
        // Do NOT fail the OS close — the OS was closed successfully
      }
    }

    // Re-fetch OS with transactions for the response
    const refreshedOS = await tenant.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            email: true,
          },
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
        stockMovements: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    const responseData = {
      ...refreshedOS,
      transactions: (refreshedOS?.transactions || []).map((t: any) => ({
        ...t,
        amount: Number(t.amount),
      })),
      stockMovements: (refreshedOS?.stockMovements || []).map((sm: any) => ({
        ...sm,
        quantity: Number(sm.quantity),
        previousQuantity: Number(sm.previousQuantity),
        newQuantity: Number(sm.newQuantity),
      })),
      financeActive,
      inventoryActive,
    };

    return NextResponse.json(responseData);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente. ${err.details
            .map(
              (d) =>
                `"${d.productName}": disponível ${d.available}, necessário ${d.required}`
            )
            .join("; ")}.`,
          insufficientStock: true,
          details: err.details,
        },
        { status: 409 }
      );
    }

    console.error("Failed to close OS:", err);
    return NextResponse.json(
      { error: "Erro ao finalizar ordem de servico" },
      { status: 500 }
    );
  }
}