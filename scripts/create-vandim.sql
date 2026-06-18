-- Cria empresa + usuario vandimavellar
-- Senha: 123456 (hash bcrypt ja gerado)

INSERT INTO companies (id, name, status, "trialEndsAt", "createdAt", "updatedAt")
VALUES (
  'company-vandim',
  'Empresa do Vandim',
  'TRIAL',
  NOW() + INTERVAL '15 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name, "passwordHash", role, "companyId", active, "createdAt", "updatedAt")
VALUES (
  'user-vandim-' || substr(md5(random()::text), 1, 16),
  'vandimavellar1997@gmail.com',
  'Vandim',
  '$2b$12$HfBtjydgPMEadeKyg99ISe4wKrS.0frlBkbZF3rGF5NYHDmy9szhi',
  'COMPANY_ADMIN',
  'company-vandim',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", active = true;

-- Ativa todos os 10 modulos
INSERT INTO company_modules (id, "companyId", "moduleKey", active, "activatedAt", "price", "createdAt", "updatedAt")
SELECT
  'cm-vandim-' || m.key,
  'company-vandim',
  m.key,
  true,
  NOW(),
  20,
  NOW(),
  NOW()
FROM modules m
WHERE m.active = true
ON CONFLICT ("companyId", "moduleKey") DO UPDATE SET active = true, "activatedAt" = NOW(), "updatedAt" = NOW();

-- Verifica
SELECT u.email, u.name, u.role, c.name as company, c.status
FROM users u
JOIN companies c ON u."companyId" = c.id
WHERE u.email = 'vandimavellar1997@gmail.com';
