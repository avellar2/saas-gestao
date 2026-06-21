import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantPrisma, prisma } from "@/lib/prisma";

async function checkModuleAccess(companyId: string, moduleKey: string): Promise<boolean> {
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleKey: { companyId, moduleKey } },
  });
  return companyModule?.active ?? false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const companyId = (session.user as Record<string, unknown>).companyId as string;

  const hasAccess = await checkModuleAccess(companyId, "inventory");
  if (!hasAccess) {
    return NextResponse.json({ error: "Módulo não ativo" }, { status: 403 });
  }

  const tenant = tenantPrisma(companyId);

  const products = await tenant.product.findMany({ where: { active: true } });

  let totalAtivos = 0;
  let totalBaixo = 0;
  let totalZerados = 0;
  let valorTotalEstoque = 0;

  for (const p of products) {
    const qty = Number(p.quantity);
    const min = Number(p.minStock);
    const salePrice = Number(p.salePrice);

    totalAtivos++;
    if (qty <= 0) totalZerados++;
    else if (qty <= min) totalBaixo++;
    valorTotalEstoque += qty * salePrice;
  }

  // Últimas 10 movimentações
  const recentMovements = await tenant.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      product: { select: { id: true, name: true } },
    },
  });

  const serializedMovements = recentMovements.map((m) => ({
    ...m,
    quantity: Number(m.quantity),
    previousQuantity: Number(m.previousQuantity),
    newQuantity: Number(m.newQuantity),
  }));

  return NextResponse.json({
    totalAtivos,
    totalBaixo,
    totalZerados,
    valorTotalEstoque,
    recentMovements: serializedMovements,
  });
}
