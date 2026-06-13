import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const tables = [
      "users", "customers", "quotes", "quote_items",
      "service_orders", "service_order_items",
      "company_modules", "subscriptions",
      "products", "financial_transactions",
      "appointments", "catalog_items", "menu_items",
      "activity_logs"
    ];

    for (const t of tables) {
      await client.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
      console.log(`✅ FORCE RLS applied to ${t}`);
    }

    // Verify
    for (const t of tables) {
      const rls = await client.query(
        "SELECT relname, relforcerowsecurity FROM pg_class WHERE relname = $1",
        [t]
      );
      console.log(`${t}: force=${rls.rows[0]?.relforcerowsecurity}`);
    }

    // Test RLS
    await client.query("SELECT set_config('app.current_company_id', 'fake-company-id', true)");
    const blocked = await client.query("SELECT count(*) as cnt FROM customers");
    console.log(`\nCom company_id='fake-company-id': ${blocked.rows[0].cnt} clientes (esperado: 0)`);

    await client.query("SELECT set_config('app.current_company_id', '', true)");
    const all = await client.query("SELECT count(*) as cnt FROM customers");
    console.log(`Com company_id='' (admin): ${all.rows[0].cnt} clientes`);

  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
