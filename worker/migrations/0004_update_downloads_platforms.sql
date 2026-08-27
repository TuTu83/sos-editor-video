-- Migration 0004: Atualiza��o sistema de downloads (Windows + Android/iOS em breve)
-- Altera��es:
--   1. Adiciona coluna `active` INTEGER DEFAULT 1 � tabela downloads
--   2. Garante plataforma Windows marcada como ativa
--   3. Cria/atualiza plataformas Android e iOS (desativadas, sem URL)
-- Idempotente: segura para rodar v�rias vezes.

-- 1) Adiciona coluna `active` (D1/SQLite desta inst�ncia n�o suporta IF NOT EXISTS no ALTER TABLE)
ALTER TABLE downloads ADD COLUMN active INTEGER DEFAULT 1;

-- 2) Garante Windows ativo (mesmo que registro j� exista vindo da 0002 com active=NULL ou 0)
INSERT OR IGNORE INTO downloads (os, version, url, count, active)
VALUES (
    'windows',
    '1.1.0',
    'https://github.com/TuTu83/sos-editor-video/releases/download/V1.1.0/SOS.Editor.Setup.1.1.0.exe',
    0,
    1
);
UPDATE downloads
SET active = 1,
    version = COALESCE(NULLIF(version, ''), '1.1.0'),
    url = COALESCE(NULLIF(url, ''), 'https://github.com/TuTu83/sos-editor-video/releases/download/V1.1.0/SOS.Editor.Setup.1.1.0.exe')
WHERE os = 'windows';

-- 3) Cria plataforma Android desativada
INSERT OR IGNORE INTO downloads (os, version, url, count, active)
VALUES ('android', NULL, NULL, 0, 0);
UPDATE downloads
SET active = 0, version = NULL, url = NULL
WHERE os = 'android';

-- 4) Cria plataforma iOS desativada
INSERT OR IGNORE INTO downloads (os, version, url, count, active)
VALUES ('ios', NULL, NULL, 0, 0);
UPDATE downloads
SET active = 0, version = NULL, url = NULL
WHERE os = 'ios';
