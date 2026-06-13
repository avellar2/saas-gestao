import pg from "pg";

/**
 * Cria o role 'gestor_app' (não-superuser) e testa RLS.
 *
 * Uso: npx tsx --env-file=.env prisma/tests/setup-rls-role.ts
 *
 * Em produção, a aplicação DEVE conectar como gestor_app (não como supor).
 * Superusers bypassam RLS mesmo com FORCE ROW LEVEL SECURITY.
 */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // 1. Verificar se já tem o role
    const existing = await client.query(
      "SELECT rolname FROM pg_roles WHERE rolname = 'gestor_app'"
    );

    if (existing.rows.length === 0) {
      console.log("🔧 Criando role gestor_app...");
      await client.query("CREATE ROLE gestor_app WITH LOGIN PASSWORD 'gestor_app_123'");
      await client.query("GRANT USAGE ON SCHEMA public TO gestor_app");
      await client.query("GRANT USAGE ON SCHEMA app TO gestor_app");
      await client.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestor_app");
      await client.query("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestor_app");
      await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gestor_app");
      await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gestor_app");
      await client.query("GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app TO gestor_app");
      console.log("✅ Role criado com sucesso\n");
    } else {
      console.log("✅ Role gestor_app já existe\n");
    }

    // 2. Conectar como gestor_app para testar RLS
    const appPool = new pg.Pool({
      connectionString: "postgresql://gestor_app:gestor_app_123@localhost:5433/gestor_local?schema=public",
    });
    const appClient = await appPool.connect();

    try {
      // Verificar que gestor_app NÃO é superuser
      const isSuper = await appClient.query(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
      );
      console.log("Role gestor_app:", JSON.stringify(isSuper.rows[0], null, 2));
      console.log("  (rolbypassrls = false significa que RLS será aplicado)\n");

      // 3. Testar RLS como gestor_app
      console.log("═══ Teste RLS com gestor_app ═══\n");

      // Seta sessão como empresa fake e tenta ler
      await appClient.query("SELECT set_config('app.current_company_id', 'fake-id', true)");
      const blocked = await appClient.query("SELECT count(*) as cnt FROM customers");
      console.log(`Com company_id='fake-id': ${blocked.rows[0].cnt} clientes (esperado: 0)`);
      console.log(blocked.rows[0].cnt === "0" ? "✅ RLS bloqueou!" : "❌ RLS não bloqueou");

      // Seta sessão como empty (admin) e tenta ler
      await appClient.query("SELECT set_config('app.current_company_id', '', true)");
      const all = await appClient.query("SELECT count(*) as cnt FROM customers");
      console.log(`\nCom company_id='' (admin): ${all.rows[0].cnt} clientes (esperado: > 0)`);
      console.log(Number(all.rows[0].cnt) > 0 ? "✅ Admin vê todos!" : "❌ Algo errado");

      // 4. Testar que um companyId real funciona
      const companies = await appClient.query("SELECT id, name FROM companies LIMIT 1");
      if (companies.rows.length > 0) {
        await appClient.query(
          "SELECT set_config('app.current_company_id', $1, true)",
          [companies.rows[0].id]
        );
        const ownData = await appClient.query("SELECT count(*) as cnt FROM customers");
        console.log(`\nCom company_id real: ${ownData.rows[0].cnt} clientes (deve ver apenas os seus)`);
      }

    } finally {
      appClient.release();
      await appPool.end();
    }

    console.log("\n═══ Resumo ═══");
    console.log("Para RLS funcionar na aplicação, conecte como gestor_app:");
    console.log('DATABASE_URL="postgresql://gestor_app:gestor_app_123@localhost:5433/gestor_local?schema=public"');
    console.log("\nOu use o helper: SET ROLE gestor_app antes de operações tenant.");

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);