// Cria empresa + usuario no banco via Prisma direto.
// Uso: npx tsx scripts/create-user.ts <email> <nome> <senha> [empresa]

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcryptjs from "bcryptjs";

async function main() {
  const [, , email, name, password, companyName] = process.argv;
  if (!email || !name || !password) {
    console.log("Uso: npx tsx scripts/create-user.ts <email> <nome> <senha> [empresa]");
    process.exit(1);
  }

  const companyId = "company-" + email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const finalCompanyName = companyName || "Empresa " + name;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Verifica se ja existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuario ja existe. Atualizando senha...");
    const passwordHash = await bcryptjs.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { passwordHash, active: true },
    });
    console.log("OK - Senha atualizada para", email);
    await prisma.$disconnect();
    return;
  }

  // Cria empresa
  await prisma.company.upsert({
    where: { id: companyId },
    create: { id: companyId, name: finalCompanyName, status: "TRIAL" },
    update: {},
  });

  // Cria usuario
  const passwordHash = await bcryptjs.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "COMPANY_ADMIN",
      companyId,
      active: true,
    },
  });

  // Ativa todos os modulos (10)
  const modules = [
    "customers", "quotes", "service_orders", "inventory", "finance",
    "users", "scheduling", "catalog", "menu", "reports",
  ];
  for (const moduleKey of modules) {
    await prisma.companyModule.upsert({
      where: { companyId_moduleKey: { companyId, moduleKey } },
      create: { companyId, moduleKey, active: true, activatedAt: new Date() },
      update: { active: true, activatedAt: new Date() },
    });
  }

  console.log("OK - Usuario criado:");
  console.log("  Email:", email);
  console.log("  Senha:", password);
  console.log("  Empresa:", finalCompanyName);
  console.log("  Empresa ID:", companyId);
  console.log("  Modulos: todos (10)");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
