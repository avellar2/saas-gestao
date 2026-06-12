import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const TENANT_MODELS = new Set([
  "User",
  "Customer",
  "Quote",
  "QuoteItem",
  "ServiceOrder",
  "ServiceOrderItem",
  "CompanyModule",
  "Subscription",
]);

function createPrismaClient() {
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function tenantPrisma(companyId: string) {
  return prisma.$extends({
    name: "tenant",
    query: {
      $allModels: {
        async $allOperations({ args, model, operation, query }) {
          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }

          if (operation.startsWith("find") || operation === "aggregate" || operation === "count") {
            args.where = { ...args.where, companyId };
          }

          if (operation === "create") {
            args.data = { ...args.data, companyId };
          }

          if (operation === "createMany") {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item: Record<string, unknown>) => ({
                ...item,
                companyId,
              }));
            } else {
              args.data = { ...args.data, companyId };
            }
          }

          if (operation.startsWith("update") || operation === "delete" || operation === "deleteMany") {
            args.where = { ...args.where, companyId };
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof tenantPrisma>;