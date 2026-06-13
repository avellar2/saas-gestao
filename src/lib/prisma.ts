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
  "QuoteItem",
  "ServiceOrder",
  "ServiceOrderItem",
  "CompanyModule",
  "Subscription",
  "Product",
  "FinancialTransaction",
  "Appointment",
  "CatalogItem",
  "MenuItem",
  "ActivityLog",
  "PasswordResetToken",
]);

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
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
          // Set RLS session variable before each operation.
          // This runs on the same connection as the subsequent query()
          // because Prisma uses a single connection per query pipeline.
          await prisma.$executeRawUnsafe(
            `SELECT set_config('app.current_company_id', $1, true)`,
            companyId
          );

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