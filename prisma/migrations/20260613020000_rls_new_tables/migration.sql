-- RLS para as novas tabelas (products, financial_transactions)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON products FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON products FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON products FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON products FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select ON financial_transactions FOR SELECT
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_insert ON financial_transactions FOR INSERT
  WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_update ON financial_transactions FOR UPDATE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

CREATE POLICY tenant_delete ON financial_transactions FOR DELETE
  USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
