import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { z } from "zod";

const entradaSchema = z.object({
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  description: z.string().optional().or(z.literal("")),
});

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = tenantPrisma(companyId);

  const product = await tenant.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = entradaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dados inválidos" },
      { status: 400 }
    );
  }

  const { quantity, description } = parsed.data;
  const userId = (session.user as Record<string, unknown>).id as string;
  const userName = (session.user as Record<string, unknown>).name as string;

  const result = await prisma.$transaction(async (tx) => {
    // Seta RLS
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_company_id', $1, true)`,
      companyId
    );

    const updated = await tx.product.update({
      where: { id },
      data: { quantity: { increment: quantity } },
    });

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        productId: id,
        type: "IN",
        reason: "MANUAL_ADJUSTMENT",
        quantity,
        previousQuantity: Number(product.quantity),
        newQuantity: Number(updated.quantity),
        description: description?.trim() || null,
        createdById: userId,
      },
    });

    return { product: updated, movement };
  });

  await logActivity({
    tenant,
    userId,
    userName,
    action: "UPDATE",
    entity: "product",
    entityId: id,
    details: `Entrada manual de estoque: ${product.name} +${quantity}`,
  });

  return NextResponse.json({
    ...result.product,
    amount: Number(result.product.quantity),
  });
}
