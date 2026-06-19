import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const TENANT_MODELS = new Set([
  "User",
  "Customer",
  "Quote",
  "ServiceOrder",
  "CompanyModule",
  "Subscription",
  "Product",
  "FinancialTransaction",
  "Appointment",
  "CatalogItem",
  "MenuItem",
  "RestaurantTable",
  "MenuOrder",
  "ActivityLog",
  "PasswordResetToken",
  "StockMovement",
]);

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = Record<string, any>;

export function tenantPrisma(companyId: string) {
  return prisma.$extends({
    name: "tenant",
    query: {
      $allModels: {
        async $allOperations({ args, model, operation, query }) {
          // RLS context is set per-request by a simpler mechanism.
          // The WHERE clause injection below handles multi-tenancy.
          // (set_config approach had pool connection issues)

          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }

          const typedArgs = args as AnyArgs;

          if (operation.startsWith("find") || operation === "aggregate" || operation === "count") {
            typedArgs.where = { ...typedArgs.where, companyId };
          }

          if (operation === "create") {
            typedArgs.data = { ...typedArgs.data, companyId };
          }

          if (operation === "createMany") {
            if (Array.isArray(typedArgs.data)) {
              typedArgs.data = typedArgs.data.map((item: Record<string, unknown>) => ({
                ...item,
                companyId,
              }));
            } else {
              typedArgs.data = { ...typedArgs.data, companyId };
            }
          }

          if (operation.startsWith("update") || operation === "delete" || operation === "deleteMany") {
            typedArgs.where = { ...typedArgs.where, companyId };
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof tenantPrisma>;