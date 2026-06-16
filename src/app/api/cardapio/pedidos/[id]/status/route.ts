import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { updateMenuOrderStatusSchema } from "@/lib/validations";

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

  const hasAccess = await checkModuleAccess(companyId, "menu");
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

  const updated = await tenant.menuOrder.update({
    where: { id },
    data: { status: newStatus },
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

  return NextResponse.json(updated);
}
