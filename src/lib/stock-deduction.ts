import { prisma } from "./prisma";

export interface InsufficientStockItem {
  productId: string;
  productName: string;
  available: number;
  required: number;
}

export class InsufficientStockError extends Error {
  public readonly details: InsufficientStockItem[];
  public readonly code = "INSUFFICIENT_STOCK";

  constructor(details: InsufficientStockItem[]) {
    const messages = details.map(
      (d) =>
        `"${d.productName}": disponível ${d.available}, necessário ${d.required}`
    );
    super(`Estoque insuficiente para os produtos: ${messages.join("; ")}.`);
    this.name = "InsufficientStockError";
    this.details = details;
  }
}

/**
 * Deduz o estoque dos itens vinculados a produtos em uma OS.
 *
 * Deve ser chamado DENTRO de um callback de `prisma.$transaction()`.
 *
 * Regras:
 * - Só processa itens com `productId` preenchido (itens manuais são ignorados).
 * - Usa `updateMany` com `where: { quantity: { gte } }` e `{ decrement }` para
 *   proteção contra race condition — a baixa só ocorre se ainda há estoque.
 * - Se o estoque for insuficiente, lança `InsufficientStockError` (rollback).
 * - Cria um `StockMovement` do tipo OUT / SERVICE_ORDER para cada produto.
 *
 * @param tx - Cliente de transação do Prisma (de `prisma.$transaction`)
 */
export async function deductStockForServiceOrder(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    companyId: string;
    serviceOrderId: string;
    items: Array<{
      productId: string | null;
      quantity: number;
    }>;
    osCode: string;
    userId: string;
  }
): Promise<void> {
  const { companyId, serviceOrderId, items, osCode, userId } = params;

  // ── Filtra apenas itens com produto vinculado ──
  const itemsWithProduct = items.filter(
    (item): item is { productId: string; quantity: number } =>
      item.productId != null && item.productId !== ""
  );

  if (itemsWithProduct.length === 0) return;

  // ── Garante o contexto RLS dentro da transaction ──
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.current_company_id', $1, true)`,
    companyId
  );

  const insufficientItems: InsufficientStockItem[] = [];

  // ── Para cada item, baixa o estoque de forma condicional ──
  for (const item of itemsWithProduct) {
    // Tenta atualizar só se a quantidade atual for >= necessária
    const result = await tx.product.updateMany({
      where: {
        id: item.productId,
        companyId,
        quantity: { gte: item.quantity },
      },
      data: {
        quantity: { decrement: item.quantity },
      },
    });

    if (result.count === 0) {
      // Descobre o motivo: produto não encontrado ou estoque insuficiente
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, quantity: true },
      });

      if (!product) {
        throw new Error(`Produto não encontrado: ${item.productId}`);
      }

      insufficientItems.push({
        productId: item.productId,
        productName: product.name,
        available: Number(product.quantity),
        required: item.quantity,
      });
      continue;
    }

    // Lê o produto já atualizado para criar o StockMovement
    const updatedProduct = await tx.product.findUnique({
      where: { id: item.productId },
      select: { quantity: true },
    });

    if (!updatedProduct) {
      throw new Error(
        `Produto não encontrado após baixa: ${item.productId}`
      );
    }

    const newQty = Number(updatedProduct.quantity);
    const previousQty = newQty + Number(item.quantity);

    await tx.stockMovement.create({
      data: {
        companyId,
        productId: item.productId,
        serviceOrderId,
        type: "OUT",
        reason: "SERVICE_ORDER",
        quantity: Number(item.quantity),
        previousQuantity: previousQty,
        newQuantity: newQty,
        description: `Baixa pela OS ${osCode}`,
        createdById: userId,
      },
    });
  }

  // ── Se algum item teve estoque insuficiente, lança erro para rollback ──
  if (insufficientItems.length > 0) {
    throw new InsufficientStockError(insufficientItems);
  }
}