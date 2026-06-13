-- RLS para Appointment, CatalogItem, MenuItem
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON appointments FOR SELECT USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_insert ON appointments FOR INSERT WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_update ON appointments FOR UPDATE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_delete ON appointments FOR DELETE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON catalog_items FOR SELECT USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_insert ON catalog_items FOR INSERT WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_update ON catalog_items FOR UPDATE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_delete ON catalog_items FOR DELETE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON menu_items FOR SELECT USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_insert ON menu_items FOR INSERT WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_update ON menu_items FOR UPDATE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_delete ON menu_items FOR DELETE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
