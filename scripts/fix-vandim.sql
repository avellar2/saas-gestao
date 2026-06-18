UPDATE users SET name = 'Vandim' WHERE email = 'vandimavellar1997@gmail.com';
DELETE FROM password_reset_tokens WHERE email = 'vandimavellar1997@gmail.com';
SELECT u.id, u.email, u.name, u.role, c.name as company, c.status
FROM users u JOIN companies c ON u."companyId" = c.id
WHERE u.email = 'vandimavellar1997@gmail.com';
