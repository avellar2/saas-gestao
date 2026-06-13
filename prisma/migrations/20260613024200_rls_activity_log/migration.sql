ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON activity_logs FOR SELECT USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_insert ON activity_logs FOR INSERT WITH CHECK (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_update ON activity_logs FOR UPDATE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
CREATE POLICY tenant_delete ON activity_logs FOR DELETE USING (app.current_company_id() IS NULL OR "companyId" = app.current_company_id());
