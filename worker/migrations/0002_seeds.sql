-- Migration 0002: Seeds padrão (admin, plans, settings, downloads)
-- MESMOS seeds de database.js Etapa 2 Item 13

-- Admin padrão: username 'tutupoker' / senha 'Juliano1983*' (hash bcrypt 10 rounds — VÁLIDO, verificado)
INSERT OR IGNORE INTO admin (id, username, password)
VALUES (
    1,
    'tutupoker',
    '$2a$10$QsxGBVB4RHoraq./cKLoeeFplWZa0cShXyiGMNObTmg8hOv88qmZG'
);

-- Settings padrão
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_name', 'S.O.S Editor');
INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenance_mode', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('hero_title', 'Edite vídeos como um profissional');
INSERT OR IGNORE INTO settings (key, value) VALUES ('hero_subtitle', 'O editor mais leve e poderoso para Windows, Android e iOS.');
INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_url', '/assets/logo.png');
INSERT OR IGNORE INTO settings (key, value) VALUES ('payment_active', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('pix_key', 'TEST-PIX-KEY-123');
INSERT OR IGNORE INTO settings (key, value) VALUES ('contact_email', 'suporte@soseditor.com');

-- Plans padrão (IDs fixos 1,2,3)
INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (1, 'Gratuito', 0, 'free', 1);
INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (2, 'Mensal', 4.99, 'monthly', 1);
INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (3, 'Vitalício', 199.90, 'lifetime', 1);

-- Garante Mensal = 4.99 (update idempotente, como database.js)
UPDATE plans SET name = 'Mensal', price = 4.99, type = 'monthly', active = 1
WHERE id = 2 AND (name != 'Mensal' OR ABS(price - 4.99) > 0.0001);

-- Downloads padrão v1.1.0 (CORRIGIDO: 4 valores para 4 colunas; Android/iOS desativados futuramente pela migration 0004 que adiciona active)
INSERT OR IGNORE INTO downloads (os, version, url, count) VALUES (
    'windows',
    '1.1.0',
    'https://github.com/TuTu83/sos-editor-video/releases/download/V1.1.0/SOS.Editor.Setup.1.1.0.exe',
    0
);
INSERT OR IGNORE INTO downloads (os, version, url, count) VALUES (
    'android',
    NULL,
    NULL,
    0
);
INSERT OR IGNORE INTO downloads (os, version, url, count) VALUES (
    'ios',
    NULL,
    NULL,
    0
);
