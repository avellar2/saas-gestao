import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { updateMenuOrderStatusSchema } from "@/lib/validations";
import { PAYMENT_METHOD_LABELS } from "@/lib/menu-helpers";
import { upsertFinancialTx } from "@/lib/financial-tx";

// Transições de status permitidas
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const [hasAccess, financeActive] = await Promise.all([
    checkModuleAccess(companyId, "menu"),
    checkModuleAccess(companyId, "finance"),
  ]);

  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.menuOrder.findUnique({
    where: { id },
    include: { table: { select: { name: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateMenuOrderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Status inválido", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const newStatus = parsed.data.status;
  const currentStatus = existing.status;

  // Valida transição
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Transição inválida: ${currentStatus} → ${newStatus}`,
        allowedTransitions: allowed,
      },
      { status: 400 }
    );
  }

  // Exige forma de pagamento ao entregar
  if (newStatus === "DELIVERED" && !parsed.data.paymentMethod) {
    return NextResponse.json(
      { error: "Forma de pagamento é obrigatória ao entregar o pedido" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "DELIVERED") {
    updateData.paymentMethod = parsed.data.paymentMethod;
    updateData.paidAt = new Date();
  }

  const updated = await tenant.menuOrder.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      table: { select: { name: true } },
    },
  });

  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;

  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "menu_order",
    entityId: id,
    details: `Pedido #${existing.orderNumber}: ${currentStatus} → ${newStatus}`,
  });

  // Log de pagamento quando entregue
  if (newStatus === "DELIVERED" && parsed.data.paymentMethod) {
    const paymentLabel = PAYMENT_METHOD_LABELS[parsed.data.paymentMethod] || parsed.data.paymentMethod;
    await logActivity({
      tenant,
      userId,
      userName,
      action: "UPDATE",
      entity: "menu_order",
      entityId: id,
      details: `Pagamento registrado no Pedido #${existing.orderNumber}: ${paymentLabel}`,
    });
  }

  // ── Integração Financeira (best-effort) ──────────────────────────────
  if (financeActive) {
    try {
      // P05 fix: usar upsertFinancialTx com SERIALIZABLE para evitar
      // duplicação quando dois clientes entregam o mesmo pedido ao mesmo tempo.
      if (newStatus === "DELIVERED") {
        const now = new Date();
        const tableName = existing.table?.name || null;
        const paymentLabel = parsed.data.paymentMethod
          ? PAYMENT_METHOD_LABELS[parsed.data.paymentMethod] || parsed.data.paymentMethod
          : "Não informado";
        const orderTypeLabel = existing.orderType === "TABLE"
          ? `Mesa ${tableName}`
          : "Para viagem";

        const txResult = await upsertFinancialTx({
          companyId,
          menuOrderId: id,
          type: "RECEIVABLE",
          description: `Receita do Pedido #${existing.orderNumber}`,
          category: "Cardápio",
          amount: Number(existing.total),
          customerId: null,
          status: "PAID",
          paidAt: now,
          dueDate: now,
          notes: `Pedido #${existing.orderNumber} - ${orderTypeLabel} - Pagamento: ${paymentLabel}`,
          ignoreCancelled: true, // P12 fix: ignora tx canceladas
        });

        if (txResult) {
          await logActivity({
            tenant,
            userId,
            userName,
            action: txResult.created ? "CREATE" : "UPDATE",
            entity: "financial",
            entityId: txResult.id,
            details: txResult.created
              ? `Receita financeira criada a partir do Pedido #${existing.orderNumber}`
              : `Receita financeira atualizada a partir do Pedido #${existing.orderNumber}`,
          });
        }

        await logActivity({
          tenant,
          userId,
          userName,
          action: "UPDATE",
          entity: "menu_order",
          entityId: id,
          details: `Pedido #${existing.orderNumber} entregue e lançado no caixa`,
        });
      } else if (newStatus === "CANCELLED") {
        // P12 fix: cancelar tx existente (se houver) via SERIALIZABLE
        const cancelResult = await upsertFinancialTx({
          companyId,
          menuOrderId: id,
          type: "RECEIVABLE",
          description: "Cancelado",
          category: "Cardápio",
          amount: 0,
          customerId: null,
          status: "CANCELLED",
          paidAt: null,
          dueDate: new Date(),
          notes: `Pedido #${existing.orderNumber} cancelado`,
          ignoreCancelled: false, // permite cancelar a tx existente
        });
        if (cancelResult) {
          await logActivity({
            tenant,
            userId,
            userName,
            action: "UPDATE",
            entity: "financial",
            entityId: cancelResult.id,
            details: `Pedido #${existing.orderNumber} entregue foi cancelado; receita financeira cancelada`,
          });
        }
      }
    } catch (err) {
      // Erro no financeiro não quebra a mudança de status do pedido
      console.error("Erro ao criar/atualizar transação financeira:", err);
    }
  }

  return NextResponse.json({
    ...updated,
    financeActive,
  });
}
