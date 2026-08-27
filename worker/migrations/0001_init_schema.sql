-- Migration 0001: Schema inicial completo do SOS Editor (ex database.js initDb Etapa2 Item13)
-- Compatível com Cloudflare D1 (SQLite 3.45+)

-- 1. Admin Table
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
);

-- 2. Settings Table (Global Config)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 3. Products/Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    type TEXT, -- 'monthly', 'lifetime', 'free'
    active INTEGER DEFAULT 1
);

-- 4. Downloads Table
CREATE TABLE IF NOT EXISTS downloads (
    os TEXT PRIMARY KEY, -- 'windows', 'mac', 'linux'
    version TEXT,
    url TEXT,
    count INTEGER DEFAULT 0
);

-- 5. Visits Table
CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    count INTEGER DEFAULT 0
);

-- 6. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    discount REAL,
    active INTEGER DEFAULT 1
);

-- 7. Videos Table (Published Videos)
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT UNIQUE NOT NULL,
    title TEXT,
    filename TEXT,
    size_bytes INTEGER,
    mime_type TEXT,
    storage_url TEXT,
    r2_key TEXT,
    status TEXT DEFAULT 'uploaded',
    created_at TEXT,
    uploader_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

-- 8. Users Table (Users / Licenses / Trials / Subscriptions)
-- Colunas completas (com os upgrades do initDb já aplicados, pois é banco novo)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    password TEXT,
    plan_id INTEGER,
    created_at TEXT,
    trial_started_at TEXT,
    trial_ends_at TEXT,
    status TEXT DEFAULT 'active',
    subscription_status TEXT DEFAULT 'none',
    subscription_expires_at TEXT,
    device_id TEXT,
    last_seen_at TEXT,
    display_name TEXT,
    payment_provider TEXT,
    payment_ref TEXT,
    ip_created TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status, subscription_status);

-- 9. Admin Access Grants (Liberações MANUAIS)
CREATE TABLE IF NOT EXISTS admin_access_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    granted_by_admin_id INTEGER NOT NULL,
    granted_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    reason TEXT,
    active INTEGER DEFAULT 1,
    revoked_at TEXT,
    revoked_by_admin_id INTEGER,
    revoked_reason TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(granted_by_admin_id) REFERENCES admin(id),
    FOREIGN KEY(revoked_by_admin_id) REFERENCES admin(id)
);
CREATE INDEX IF NOT EXISTS idx_grants_user_active ON admin_access_grants(user_id, active);
CREATE INDEX IF NOT EXISTS idx_grants_expires ON admin_access_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_grants_admin ON admin_access_grants(granted_by_admin_id);

-- 10. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_type, target_id, created_at);
