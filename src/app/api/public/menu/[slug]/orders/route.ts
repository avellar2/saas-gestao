import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMenuOrderSchema } from "@/lib/validations";
import { sanitizeMenuOrder } from "@/lib/menu-helpers";
import { logActivity } from "@/lib/activity-log";
import { tenantPrisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  // Busca empresa pelo slug
  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  // Verifica se o módulo menu está ativo
  const companyModule = await prisma.companyModule.findUnique({
    where: {
      companyId_moduleKey: { companyId: company.id, moduleKey: "menu" },
    },
  });

  if (!companyModule?.active) {
    return NextResponse.json({ error: "Cardápio não disponível" }, { status: 404 });
  }

  // Valida payload
  const body = await request.json();
  const parsed = createMenuOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { tableToken, orderType, customerName, customerPhone, items, notes } = parsed.data;

  // BUG-014 fix: TABLE exige tableToken
  if (orderType === "TABLE" && !tableToken) {
    return NextResponse.json(
      { error: "Para pedidos na mesa, escaneie o QR Code da mesa" },
      { status: 400 }
    );
  }

  // Valida mesa, se informada
  let tableId: string | null = null;
  if (tableToken) {
    const table = await prisma.restaurantTable.findUnique({
      where: { token: tableToken },
    });
    if (!table || table.companyId !== company.id) {
      return NextResponse.json({ error: "Mesa não encontrada" }, { status: 400 });
    }
    if (!table.active) {
      return NextResponse.json({ error: "Mesa inativa" }, { status: 400 });
    }
    tableId = table.id;
  }

  // Valida itens e calcula total no servidor
  const menuItemIds = items.map((i) => i.menuItemId);
  const dbItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      companyId: company.id,
      active: true,
    },
  });

  if (dbItems.length !== items.length) {
    return NextResponse.json(
      { error: "Um ou mais itens são inválidos ou estão inativos" },
      { status: 400 }
    );
  }

  const dbItemMap = new Map(dbItems.map((i) => [i.id, i]));
  const tenant = tenantPrisma(company.id);

  // Transaction única: gera orderNumber + cria pedido + itens
  // Retry em caso de conflito de unique (pedidos simultâneos)
  const MAX_RETRIES = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const order = await prisma.$transaction(async (tx) => {
        // Gera próximo orderNumber dentro da transaction
        const lastOrder = await tx.menuOrder.findFirst({
          where: { companyId: company.id },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true },
        });
        const nextNumber = (lastOrder?.orderNumber ?? 0) + 1;

        // Cria o pedido
        const created = await tx.menuOrder.create({
          data: {
            companyId: company.id,
            tableId,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            orderType,
            status: "RECEIVED",
            total: 0,
            notes: notes || null,
            orderNumber: nextNumber,
          },
        });

        // Cria os itens
        let total = 0;
        const orderItemsData = items.map((item) => {
          const dbItem = dbItemMap.get(item.menuItemId)!;
          const itemTotal = Number(dbItem.price) * item.quantity;
          total += itemTotal;
          return {
            orderId: created.id,
            menuItemId: item.menuItemId,
            nameSnapshot: dbItem.name,
            priceSnapshot: dbItem.price,
            quantity: item.quantity,
            notes: item.notes || null,
            total: itemTotal,
          };
        });

        await tx.menuOrderItem.createMany({
          data: orderItemsData,
        });

        // Atualiza total do pedido
        const updated = await tx.menuOrder.update({
          where: { id: created.id },
          data: { total },
          include: {
            items: true,
            table: { select: { name: true } },
          },
        });

        return updated;
      });

      // ActivityLog (pedido público — sem userId)
      try {
        await logActivity({
          tenant,
          userId: undefined,
          userName: customerName || "Cliente",
          action: "CREATE",
          entity: "menu_order",
          entityId: order.id,
          details: `Pedido #${order.orderNumber} — ${orderType === "TABLE" ? `Mesa ${order.table?.name || "N/A"}` : "Viagem"} — R$ ${Number(order.total).toFixed(2)}`,
        });
      } catch {
        // Log falhou — não impede o pedido
      }

      // Retorna pedido sanitizado
      const safeOrder = sanitizeMenuOrder(order);
      return NextResponse.json(safeOrder, { status: 201 });
    } catch (err) {
      lastError = err;
      // Se for erro de unique constraint, tenta novamente
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        continue;
      }
      // Se for ORDER_NUMBER_CONFLICT (nosso erro customizado), tenta novamente
      if (err instanceof Error && err.message === "ORDER_NUMBER_CONFLICT") {
        continue;
      }
      // Outro erro — não retry
      break;
    }
  }

  return NextResponse.json(
    { error: "Erro ao criar pedido. Tente novamente." },
    { status: 500 }
  );
}
