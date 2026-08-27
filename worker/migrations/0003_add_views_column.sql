-- Migration 0003: adiciona coluna views na tabela videos (contagem views do player público)
-- Cloudflare D1 é SQLite: usamos ALTER TABLE

ALTER TABLE videos ADD COLUMN views INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views);
