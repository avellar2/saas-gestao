/**
 * Helpers para validação cross-tenant.
 *
 * Garante que IDs recebidos do client (customerId, productId, etc.)
 * pertencem à mesma empresa do usuário logado.
 *
 * Uso:
 *   const customer = await assertCustomerBelongsToCompany(tenant, customerId, companyId);
 *   if (!customer) return notFound();
 *
 * Por que não usar Prisma nativo:
 *   O tenantPrisma injeta companyId via extensão Prisma, mas o erro retornado
 *   é "RecordNotFound" em vez de "CrossTenantAccess". Validar explicitamente
 *   aqui torna o erro previsível e auditável.
 */

import { NextResponse } from "next/server";
import type { TenantPrismaClient } from "./prisma";

export type EntityName =
  | "Cliente"
  | "Produto"
  | "Orcamento"
  | "Ordem de Servico"
  | "Pedido do Cardapio"
  | "Mesa"
  | "Item do Cardapio"
  | "Usuario"
  | "Produto do Catalogo";

/**
 * Valida que um customer pertence à empresa. Retorna o customer ou null.
 */
export async function findCustomerInCompany(
  tenant: TenantPrismaClient,
  customerId: string | null | undefined
): Promise<{ id: string; name: string; phone: string | null; whatsapp: string | null; email: string | null } | null> {
  if (!customerId) return null;
  const c = await tenant.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, whatsapp: true, email: true },
  });
  return c;
}

/**
 * Valida que um product pertence à empresa. Retorna o product ou null.
 */
export async function findProductInCompany(
  tenant: TenantPrismaClient,
  productId: string | null | undefined
): Promise<{ id: string } | null> {
  if (!productId) return null;
  const p = await tenant.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  return p;
}

/**
 * Valida que um quote pertence à empresa.
 */
export async function findQuoteInCompany(
  tenant: TenantPrismaClient,
  quoteId: string | null | undefined
): Promise<{ id: string } | null> {
  if (!quoteId) return null;
  const q = await tenant.quote.findUnique({
    where: { id: quoteId },
    select: { id: true },
  });
  return q;
}

/**
 * Valida que um menuItem pertence à empresa.
 */
export async function findMenuItemInCompany(
  tenant: TenantPrismaClient,
  menuItemId: string | null | undefined
): Promise<{ id: string } | null> {
  if (!menuItemId) return null;
  const m = await tenant.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true },
  });
  return m;
}

/**
 * Valida que uma mesa pertence à empresa.
 */
export async function findTableInCompany(
  tenant: TenantPrismaClient,
  tableId: string | null | undefined
): Promise<{ id: string } | null> {
  if (!tableId) return null;
  const t = await tenant.restaurantTable.findUnique({
    where: { id: tableId },
    select: { id: true },
  });
  return t;
}

/**
 * Valida que um catalogItem pertence à empresa.
 */
export async function findCatalogItemInCompany(
  tenant: TenantPrismaClient,
  itemId: string | null | undefined
): Promise<{ id: string } | null> {
  if (!itemId) return null;
  const c = await tenant.catalogItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  });
  return c;
}

/**
 * Valida múltiplos IDs de uma vez. Retorna lista dos que pertencem à empresa.
 * Útil para validar arrays de items.
 */
export async function findProductsInCompany(
  tenant: TenantPrismaClient,
  productIds: string[]
): Promise<string[]> {
  if (productIds.length === 0) return [];
  const products = await tenant.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  return products.map((p) => p.id);
}

/**
 * Resposta 404 padronizada para cross-tenant ou registro não encontrado.
 * NÃO retorna 403 para evitar revelar que o registro existe em outra empresa.
 */
export function notFoundResponse(entity: EntityName | "Registro" = "Registro"): NextResponse {
  return NextResponse.json(
    { error: `${entity} nao encontrado` },
    { status: 404 }
  );
}
