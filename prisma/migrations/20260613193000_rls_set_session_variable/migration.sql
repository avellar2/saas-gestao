-- Configura a variável de sessão app.current_company_id
-- Esta migration cria uma função que será chamada pelo Prisma middleware
-- para garantir que o RLS funcione corretamente.

-- A função já existe (criada na migration 20260612200000_rls)
-- Esta migration apenas garante que o schema app existe
-- e que a função está atualizada.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_company_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '');
$$;

-- Função para setar a variável de sessão
CREATE OR REPLACE FUNCTION app.set_current_company_id(company_id TEXT)
RETURNS VOID
LANGUAGE SQL
AS $$
  SELECT set_config('app.current_company_id', COALESCE(company_id, ''), true);
$$;
