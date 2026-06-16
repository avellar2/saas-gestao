import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "finance");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const existing = await tenant.financialTransaction.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
  }

  if (existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Transação já está cancelada" },
      { status: 400 }
    );
  }

  const updated = await tenant.financialTransaction.update({
    where: { id },
    data: {
      status: "CANCELLED",
    },
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
    details: `Transação cancelada: ${existing.description}`,
  });

  return NextResponse.json({
    ...updated,
    amount: Number(updated.amount),
  });
}
