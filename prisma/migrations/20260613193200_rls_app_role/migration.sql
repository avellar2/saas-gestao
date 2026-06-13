-- Cria um role não-superuser para a aplicação.
-- Superusers bypassam RLS, então precisamos de um role separado.
-- A aplicação passa a se conectar como esse role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gestor_app') THEN
    CREATE ROLE gestor_app WITH LOGIN PASSWORD 'gestor_app_123';
  END IF;
END
$$;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO gestor_app;
GRANT USAGE ON SCHEMA app TO gestor_app;

-- Grant ALL on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestor_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestor_app;

-- Ensure new tables/sequences also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gestor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gestor_app;

-- Grant execute on app schema functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app TO gestor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON FUNCTIONS TO gestor_app;