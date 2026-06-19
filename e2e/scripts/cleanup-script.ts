import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const E2E_PREFIX = "E2E ";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getE2ECompanyId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: "marcos@mecanicacentral.com" },
    select: { companyId: true },
  });
  return user?.companyId ?? null;
}

async function cleanupE2EData(): Promise<{ deleted: number; scope: string }> {
  const companyId = await getE2ECompanyId();
  if (!companyId) {
    return { deleted: 0, scope: "no-company" };
  }

  const where = { companyId, name: { startsWith: E2E_PREFIX } } as const;
  let total = 0;

  const e2eServiceOrders = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      OR: [
        { code: { startsWith: E2E_PREFIX } },
        { problemDescription: { startsWith: E2E_PREFIX } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
    select: { id: true },
  });
  const e2eOSIds = e2eServiceOrders.map((o) => o.id);

  if (e2eOSIds.length > 0) {
    total += (await prisma.stockMovement.deleteMany({ where: { serviceOrderId: { in: e2eOSIds } } })).count;
    total += (await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: e2eOSIds } } })).count;
    total += (await prisma.financialTransaction.deleteMany({ where: { serviceOrderId: { in: e2eOSIds } } })).count;
  }
  total += (await prisma.serviceOrder.deleteMany({
    where: {
      companyId,
      OR: [
        { code: { startsWith: E2E_PREFIX } },
        { problemDescription: { startsWith: E2E_PREFIX } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
  })).count;

  const e2eQuotes = await prisma.quote.findMany({
    where: {
      companyId,
      OR: [
        { description: { startsWith: E2E_PREFIX } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
    select: { id: true },
  });
  const e2eQuoteIds = e2eQuotes.map((q) => q.id);
  if (e2eQuoteIds.length > 0) {
    total += (await prisma.quoteItem.deleteMany({ where: { quoteId: { in: e2eQuoteIds } } })).count;
  }
  total += (await prisma.quote.deleteMany({
    where: {
      companyId,
      OR: [
        { description: { startsWith: E2E_PREFIX } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
  })).count;

  total += (await prisma.financialTransaction.deleteMany({
    where: {
      companyId,
      OR: [
        { description: { startsWith: E2E_PREFIX } },
        { serviceOrderId: { in: e2eOSIds } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
  })).count;

  const e2eProducts = await prisma.product.findMany({ where, select: { id: true } });
  const e2eProductIds = e2eProducts.map((p) => p.id);
  if (e2eProductIds.length > 0) {
    total += (await prisma.stockMovement.deleteMany({ where: { productId: { in: e2eProductIds } } })).count;
  }
  total += (await prisma.product.deleteMany({ where })).count;

  const e2eMenuItems = await prisma.menuItem.findMany({
    where: { companyId, name: { startsWith: E2E_PREFIX } },
    select: { id: true },
  });
  const e2eMenuItemIds = e2eMenuItems.map((m) => m.id);
  if (e2eMenuItemIds.length > 0) {
    total += (await prisma.menuOrderItem.deleteMany({ where: { menuItemId: { in: e2eMenuItemIds } } })).count;
  }
  total += (await prisma.menuItem.deleteMany({ where: { companyId, name: { startsWith: E2E_PREFIX } } })).count;

  total += (await prisma.restaurantTable.deleteMany({ where: { companyId, name: { startsWith: E2E_PREFIX } } })).count;
  total += (await prisma.customer.deleteMany({ where })).count;
  total += (await prisma.appointment.deleteMany({
    where: {
      companyId,
      OR: [
        { title: { startsWith: E2E_PREFIX } },
        { customer: { name: { startsWith: E2E_PREFIX } } },
      ],
    },
  })).count;
  total += (await prisma.catalogItem.deleteMany({ where: { companyId, name: { startsWith: E2E_PREFIX } } })).count;

  return { deleted: total, scope: `company=${companyId}` };
}

cleanupE2EData()
  .then((r) => {
    console.log(`[cleanup-script] deleted=${r.deleted} scope=${r.scope}`);
    return prisma.$disconnect().then(() => pool.end());
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[cleanup-script] failed:", e);
    process.exit(1);
  });
