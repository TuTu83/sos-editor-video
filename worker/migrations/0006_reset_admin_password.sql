-- Migration 0006: Reseta senha do admin padrão (id=1 tutupoker).
-- MOTIVO: migration 0002_seeds.sql original usava um hash bcrypt INVÁLIDO/PLACEHOLDER
-- para a senha 'Juliano1983*', causando sempre HTTP 401 "Credenciais inválidas" no login.
-- O INSERT OR IGNORE da 0002 NÃO atualiza linhas já existentes — daí a necessidade deste UPDATE.
UPDATE admin
SET password = '$2a$10$QsxGBVB4RHoraq./cKLoeeFplWZa0cShXyiGMNObTmg8hOv88qmZG',
    username = 'tutupoker'
WHERE id = 1 OR lower(username) = 'tutupoker';
