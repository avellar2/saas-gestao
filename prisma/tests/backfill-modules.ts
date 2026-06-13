/**
 * Backfill: cria CompanyModule entries para módulos que não existem
 * Uso: npx tsx --env-file=.env prisma/tests/backfill-modules.ts
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NEW_MODULES = ["inventory", "finance", "users_permissions", "scheduling", "catalog", "menu", "reports"] as const;

async function main() {
  console.log("📦 Backfill CompanyModule para novos módulos...\n");

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  console.log(`   ${companies.length} empresas encontradas.\n`);

  for (const company of companies) {
    for (const moduleKey of NEW_MODULES) {
      const existing = await prisma.companyModule.findUnique({
        where: { companyId_moduleKey: { companyId: company.id, moduleKey } },
      });

      if (!existing) {
        await prisma.companyModule.create({
          data: { companyId: company.id, moduleKey, active: false },
        });
        console.log(`   ➕ ${company.name} → ${moduleKey}`);
      }
    }
  }

  console.log("\n✅ Backfill concluido!");
  await prisma.$disconnect();
}

main().catch(console.error);