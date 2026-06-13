import pg from "pg";

const superPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const appPool = new pg.Pool({
  connectionString: "postgresql://gestor_app:gestor_app_123@localhost:5433/gestor_local?schema=public",
});

async function main() {
  // 1. Fix function as superuser — VOLATILE previne inlining do planner
  const superClient = await superPool.connect();
  try {
    await superClient.query(`
      CREATE OR REPLACE FUNCTION app.current_company_id()
      RETURNS TEXT
      LANGUAGE plpgsql
      VOLATILE
      AS $$
      BEGIN
        RETURN NULLIF(current_setting('app.current_company_id', true), '');
      END;
      $$;
    `);
    console.log("✅ Função reescrita como PL/pgSQL VOLATILE\n");
  } finally {
    superClient.release();
  }

  // 2. Testar com MESMA conexão (simula transação única)
  const client = await appPool.connect();
  try {
    // IMPORTANTE: set_config + query na MESMA conexão
    // Isso simula o que acontece dentro de uma transação
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_company_id', 'fake-id', true)");

    const funcTest = await client.query("SELECT app.current_company_id()");
    console.log("Function (same tx):", funcTest.rows[0].current_company_id);

    const rlsTest = await client.query("SELECT count(*) as cnt FROM customers");
    console.log("RLS count (same tx):", rlsTest.rows[0].cnt);

    if (rlsTest.rows[0].cnt === "0") {
      console.log("✅ RLS bloqueou corretamente!\n");
    } else {
      console.log("❌ RLS não bloqueou\n");
    }

    await client.query("ROLLBACK");

    // 3. Testar com companyId real
    const companies = await client.query("SELECT id FROM companies LIMIT 1");
    const realCompanyId = companies.rows[0].id;

    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_company_id', $1, true)", [realCompanyId]);

    const ownData = await client.query("SELECT count(*) as cnt FROM customers WHERE \"companyId\" = $1", [realCompanyId]);
    const rlsOwn = await client.query("SELECT count(*) as cnt FROM customers");
    console.log(`Empresa real: ${ownData.rows[0].cnt} clientes próprios`);
    console.log(`RLS vê: ${rlsOwn.rows[0].cnt} clientes`);
    console.log(ownData.rows[0].cnt === rlsOwn.rows[0].cnt ? "✅ RLS filtra corretamente!" : "❌ RLS não filtra");

    await client.query("ROLLBACK");

    // 4. Testar UPDATE bloqueado
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_company_id', 'fake-id', true)");
    try {
      await client.query("UPDATE customers SET name = 'hacked' WHERE \"companyId\" != 'fake-id'");
      console.log("\n❌ UPDATE deveria ter sido bloqueado!");
    } catch (e: any) {
      console.log("\n✅ UPDATE bloqueado pelo RLS:", e.message.split("\n")[0]);
    }
    await client.query("ROLLBACK");

  } finally {
    client.release();
    await appPool.end();
  }

  // 5. Conclusão
  console.log("\n═══ RESUMO ═══");
  console.log("RLS funciona quando set_config + query estão na MESMA transação.");
  console.log("O tenantPrisma extension precisa envolver set_config e a query");
  console.log("em um $transaction para o RLS funcionar como fail-safe.");
  console.log("\nDatabse URL para RLS:");
  console.log('postgresql://gestor_app:gestor_app_123@localhost:5433/gestor_local?schema=public');

  await superPool.end();
}
main().catch(console.error);