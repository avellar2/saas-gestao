-- RLS (Row Level Security) — Terceira camada de isolamento multiempresa
-- Funciona como fail-safe: mesmo que o Prisma extension falhe,
-- o banco impede vazamento de dados entre empresas.
--
-- ATENÇÃO: As colunas no banco estão em camelCase (padrão Prisma).
-- Exemplo: companyId, customerId, quoteId, etc.

CREATE SCHEMA IF NOT EXISTS app;

-- Função helper para ler a variável de sessão com segurança
CREATE OR REPLACE FUNCTION app.current_company_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '');
$$;

-- Helper para políticas em tabelas filhas (ex: quote_items, service_order_items)
-- que não têm companyId direto
CREATE OR REPLACE FUNCTION app.item_belongs_to_company(
  parent_table TEXT,
  parent_id_col TEXT,
  item_id TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
AS $$
DECLARE
  parent_company_id TEXT;
BEGIN
  EXECUTE format(
    'SELECT "companyId" FROM %I WHERE id = $1',
    parent_table
  ) INTO parent_company_id USING item_id;
  RETURN parent_company_id = app.current_company_id();
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON users FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON users FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON users FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON users FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

-- ════════════════════════════════════════════════════════════════
-- CUSTOMERS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON customers FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON customers FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON customers FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON customers FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

-- ════════════════════════════════════════════════════════════════
-- QUOTES
-- ════════════════════════════════════════════════════════════════
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON quotes FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON quotes FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON quotes FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON quotes FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

-- ════════════════════════════════════════════════════════════════
-- QUOTE_ITEMS (não tem companyId — usa subquery via quote)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON quote_items FOR SELECT
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items."quoteId"
      AND quotes."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_insert ON quote_items FOR INSERT
  WITH CHECK (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items."quoteId"
      AND quotes."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_update ON quote_items FOR UPDATE
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items."quoteId"
      AND quotes."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_delete ON quote_items FOR DELETE
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items."quoteId"
      AND quotes."companyId" = app.current_company_id()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- SERVICE_ORDERS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON service_orders FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON service_orders FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON service_orders FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON service_orders FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

-- ════════════════════════════════════════════════════════════════
-- SERVICE_ORDER_ITEMS (não tem companyId — usa subquery via service_order)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON service_order_items FOR SELECT
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_items."serviceOrderId"
      AND service_orders."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_insert ON service_order_items FOR INSERT
  WITH CHECK (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_items."serviceOrderId"
      AND service_orders."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_update ON service_order_items FOR UPDATE
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_items."serviceOrderId"
      AND service_orders."companyId" = app.current_company_id()
    )
  );

CREATE POLICY tenant_delete ON service_order_items FOR DELETE
  USING (
    app.current_company_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_items."serviceOrderId"
      AND service_orders."companyId" = app.current_company_id()
    )
  );

-- ════════════════════════════════════════════════════════════════
-- COMPANY_MODULES
-- ════════════════════════════════════════════════════════════════
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON company_modules FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON company_modules FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON company_modules FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON company_modules FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

-- ════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════════
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON subscriptions FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON subscriptions FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON subscriptions FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON subscriptions FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());