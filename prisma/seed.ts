import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcryptjs from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  // ── 1. Modules ────────────────────────────────────────────────────────
  console.log("Creating modules...");

  const moduleData = [
    { key: "customers", name: "Clientes", description: "Cadastro e gestão de clientes", basePrice: 50, sortOrder: 1 },
    { key: "quotes", name: "Orçamentos", description: "Criação e acompanhamento de orçamentos", basePrice: 30, sortOrder: 2 },
    { key: "service_orders", name: "Ordens de Serviço", description: "Gestão de ordens de serviço", basePrice: 25, sortOrder: 3 },
    { key: "inventory", name: "Estoque", description: "Controle de estoque e peças", basePrice: 20, sortOrder: 4 },
    { key: "scheduling", name: "Agendamento", description: "Agenda e agendamentos", basePrice: 20, sortOrder: 5 },
    { key: "catalog", name: "Catálogo", description: "Catálogo de produtos e serviços", basePrice: 20, sortOrder: 6 },
    { key: "menu", name: "Cardápio", description: "Cardápio digital para restaurantes", basePrice: 20, sortOrder: 7 },
    { key: "finance", name: "Financeiro", description: "Controle financeiro e fluxo de caixa", basePrice: 20, sortOrder: 8 },
    { key: "reports", name: "Relatórios", description: "Relatórios e métricas", basePrice: 20, sortOrder: 9 },
    { key: "users_permissions", name: "Usuários e Permissões", description: "Gestão de usuários e permissões", basePrice: 20, sortOrder: 10 },
  ];

  for (const mod of moduleData) {
    await prisma.module.upsert({
      where: { key: mod.key },
      update: {},
      create: {
        key: mod.key,
        name: mod.name,
        description: mod.description,
        basePrice: mod.basePrice,
        sortOrder: mod.sortOrder,
        active: true,
      },
    });
  }

  console.log("Modules created.");

  // ── 2. Super Admin Company + User ──────────────────────────────────────
  console.log("Creating super admin company...");

  const superAdminCompany = await prisma.company.create({
    data: {
      id: "super-admin",
      name: "Gestor Local Admin",
      status: "ACTIVE",
    },
  });

  const adminPasswordHash = await bcryptjs.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@gestorlocal.com",
      name: "Admin Gestor Local",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      companyId: superAdminCompany.id,
      active: true,
    },
  });

  console.log("Super admin created: admin@gestorlocal.com / admin123");

  // ── 3. Trial Company ───────────────────────────────────────────────────
  console.log("Creating trial company (Eletrônica Silva)...");

  const trialCompany = await prisma.company.create({
    data: {
      name: "Eletrônica Silva",
      tradeName: "E-Silva",
      document: "12.345.678/0001-90",
      phone: "(11) 99999-1111",
      whatsapp: "5511999991111",
      email: "contato@esilva.com",
      address: "Rua das Flores, 123 - São Paulo/SP",
      status: "TRIAL",
      trialStartsAt: now,
      trialEndsAt: trialEndsAt,
    },
  });

  const silvaPasswordHash = await bcryptjs.hash("silva123", 10);

  await prisma.user.create({
    data: {
      email: "silva@esilva.com",
      name: "Sr. Silva",
      passwordHash: silvaPasswordHash,
      role: "COMPANY_ADMIN",
      companyId: trialCompany.id,
      active: true,
    },
  });

  // Trial company modules: only customers active
  await prisma.companyModule.create({
    data: {
      companyId: trialCompany.id,
      moduleKey: "customers",
      active: true,
      price: 50,
      activatedAt: now,
    },
  });

  // Trial subscription
  await prisma.subscription.create({
    data: {
      companyId: trialCompany.id,
      status: "TRIAL",
      modulesCount: 1,
      monthlyPrice: 99.0,
      trialEndsAt: trialEndsAt,
    },
  });

  // Trial company customer
  await prisma.customer.create({
    data: {
      companyId: trialCompany.id,
      name: "Ana Paula",
      phone: "(11) 97777-3333",
      email: "anapaula@email.com",
    },
  });

  console.log("Trial company created: silva@esilva.com / silva123");

  // ── 4. Active Company ──────────────────────────────────────────────────
  console.log("Creating active company (Auto Mecânica Central)...");

  const activeCompany = await prisma.company.create({
    data: {
      name: "Auto Mecânica Central",
      tradeName: "Mecânica Central",
      document: "98.765.432/0001-10",
      phone: "(11) 98888-2222",
      whatsapp: "5511988882222",
      email: "contato@mecanicacentral.com",
      address: "Av. Brasil, 456 - São Paulo/SP",
      status: "ACTIVE",
      monthlyPrice: 154.0,
      planName: "Profissional",
    },
  });

  const marcosPasswordHash = await bcryptjs.hash("marcos123", 10);
  const anaPasswordHash = await bcryptjs.hash("ana123", 10);

  await prisma.user.create({
    data: {
      email: "marcos@mecanicacentral.com",
      name: "Marcos Oliveira",
      passwordHash: marcosPasswordHash,
      role: "COMPANY_ADMIN",
      companyId: activeCompany.id,
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "ana@mecanicacentral.com",
      name: "Ana Costa",
      passwordHash: anaPasswordHash,
      role: "STAFF",
      companyId: activeCompany.id,
      active: true,
    },
  });

  // Active company modules: customers, quotes, service_orders
  const activeModules = [
    { key: "customers", price: 50 },
    { key: "quotes", price: 30 },
    { key: "service_orders", price: 25 },
  ];

  for (const mod of activeModules) {
    await prisma.companyModule.create({
      data: {
        companyId: activeCompany.id,
        moduleKey: mod.key,
        active: true,
        price: mod.price,
        activatedAt: now,
      },
    });
  }

  // Active subscription
  await prisma.subscription.create({
    data: {
      companyId: activeCompany.id,
      status: "ACTIVE",
      planName: "Profissional",
      modulesCount: 3,
      monthlyPrice: 154.0,
      paymentMethod: "pix",
    },
  });

  console.log("Active company created: marcos@mecanicacentral.com / marcos123, ana@mecanicacentral.com / ana123");

  // ── 5. Sample Customers for Active Company ────────────────────────────
  console.log("Creating sample customers...");

  const customersData = [
    { name: "Carlos Santos", phone: "(11) 91234-5678", email: "carlos@email.com", document: "123.456.789-00" },
    { name: "Maria Souza", phone: "(11) 92345-6789", email: "maria@email.com", document: "234.567.890-00" },
    { name: "Pedro Lima", phone: "(11) 93456-7890", email: "pedro@email.com", document: "345.678.901-00" },
    { name: "Fernanda Rocha", phone: "(11) 94567-8901", email: "fernanda@email.com", document: "456.789.012-00" },
    { name: "Ricardo Alves", phone: "(11) 95678-9012", email: "ricardo@email.com", document: "567.890.123-00" },
  ];

  const customers = [];
  for (const c of customersData) {
    const customer = await prisma.customer.create({
      data: {
        companyId: activeCompany.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        document: c.document,
      },
    });
    customers.push(customer);
  }

  // ── 6. Sample Quotes for Active Company ───────────────────────────────
  console.log("Creating sample quotes...");

  const quote1 = await prisma.quote.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[0].id, // Carlos Santos
      number: 1,
      status: "APPROVED",
      description: "Manutenção preventiva",
      subtotal: 250.0,
      total: 250.0,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { description: "Troca de óleo", quantity: 1, unitPrice: 150, total: 150 },
          { description: "Filtro de ar", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
    },
  });

  const quote2 = await prisma.quote.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[1].id, // Maria Souza
      number: 2,
      status: "DRAFT",
      description: "Revisão completa",
      subtotal: 500.0,
      total: 500.0,
      items: {
        create: [
          { description: "Revisão completa", quantity: 1, unitPrice: 500, total: 500 },
        ],
      },
    },
  });

  console.log("Sample quotes created.");

  // ── 7. Sample Service Orders for Active Company ───────────────────────
  console.log("Creating sample service orders...");

  await prisma.serviceOrder.create({
    data: {
      companyId: activeCompany.id,
      customerId: customers[0].id, // Carlos Santos
      quoteId: quote1.id,
      number: 1,
      status: "IN_PROGRESS",
      problemDescription: "Carro fazendo barulho no motor",
      total: 250.0,
      paymentStatus: "PENDING",
      items: {
        create: [
          { description: "Troca de óleo", quantity: 1, unitPrice: 150, total: 150 },
          { description: "Filtro de ar", quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
    },
  });

  console.log("Sample service orders created.");

  // ── Done ──────────────────────────────────────────────────────────────
  console.log("\nSeed completed successfully!");
  console.log("─────────────────────────────────────────────────────");
  console.log("Login credentials:");
  console.log("  Super Admin:  admin@gestorlocal.com / admin123");
  console.log("  Trial:        silva@esilva.com / silva123");
  console.log("  Active Admin: marcos@mecanicacentral.com / marcos123");
  console.log("  Active Staff: ana@mecanicacentral.com / ana123");
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });