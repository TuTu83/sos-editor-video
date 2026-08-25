const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const candidateDbPaths = [
    process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : null,
    path.resolve(__dirname, 'database.sqlite'),
    '/tmp/database.sqlite'
].filter(Boolean);

const dbPath = (() => {
    for (const candidate of candidateDbPaths) {
        try {
            fs.mkdirSync(path.dirname(candidate), { recursive: true });
            const fd = fs.openSync(candidate, 'a');
            fs.closeSync(fd);
            return candidate;
        } catch (_) {
        }
    }
    return candidateDbPaths[0];
})();

console.log(`Using database at: ${dbPath}`);

// Connect to DB
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // 1. Admin Table
        db.run(`CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // 2. Settings Table (Global Config)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // 3. Products/Plans Table
        db.run(`CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price REAL,
            type TEXT, -- 'monthly', 'lifetime', 'free'
            active INTEGER DEFAULT 1
        )`);

        // 4. Downloads Table (Links & Counters)
        db.run(`CREATE TABLE IF NOT EXISTS downloads (
            os TEXT PRIMARY KEY, -- 'windows', 'mac', 'linux'
            version TEXT,
            url TEXT,
            count INTEGER DEFAULT 0
        )`);

        // 5. Visits Table
        db.run(`CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            count INTEGER DEFAULT 0
        )`);

        // 6. Coupons Table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            discount REAL, -- Percentage off (e.g. 10.0 for 10%)
            active INTEGER DEFAULT 1
        )`);

        // 7. Videos Table (Published Videos)
        db.run(`CREATE TABLE IF NOT EXISTS videos (
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
        )`);

        // 8. Users Table (Users / Licenses / Trials / Subscriptions)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            password TEXT,
            plan_id INTEGER,
            created_at TEXT
        )`);

        // 9. Admin Access Grants (Liberações MANUAIS pelo Admin — autoridade MÁXIMA)
        db.run(`CREATE TABLE IF NOT EXISTS admin_access_grants (
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
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_grants_user_active ON admin_access_grants(user_id, active)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_grants_expires ON admin_access_grants(expires_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_grants_admin ON admin_access_grants(granted_by_admin_id)`);

        // 10. Admin Audit Logs (Rastreabilidade TOTAL de ações comerciais)
        db.run(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_user_id INTEGER,
            action TEXT NOT NULL, -- 'plan.update_price','user.block','user.unblock','grant.create','grant.revoke','subscription.update','config.update'
            target_type TEXT, -- 'plan','user','grant','config','license'
            target_id INTEGER,
            old_value TEXT, -- JSON antes
            new_value TEXT, -- JSON depois
            reason TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_user_id, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_type, target_id, created_at)`);

        // ====== UPGRADES INCREMENTAIS DA TABELA users ======
        db.all("PRAGMA table_info(users)", [], (err, cols) => { 
            if (err || !Array.isArray(cols)) return;
            const existing = new Set(cols.map(c => String(c.name).toLowerCase()));
            const pendingAdds = [];
            const pushAdd = (col, def) => {
                if (!existing.has(String(col).toLowerCase())) {
                    pendingAdds.push(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
                }
            };
            pushAdd('trial_started_at',     'TEXT');
            pushAdd('trial_ends_at',        'TEXT');
            pushAdd('status',               "TEXT DEFAULT 'active'");
            pushAdd('subscription_status',  "TEXT DEFAULT 'none'");
            pushAdd('subscription_expires_at', 'TEXT');
            pushAdd('device_id',            'TEXT');
            pushAdd('last_seen_at',         'TEXT');
            pushAdd('display_name',         'TEXT');
            pushAdd('payment_provider',     'TEXT');
            pushAdd('payment_ref',          'TEXT');
            pushAdd('ip_created',           'TEXT');

            const runNext = (i) => {
                if (i >= pendingAdds.length) {
                    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id)`, (iErr) => {
                        if (iErr && !String(iErr.message).includes('already exists')) {
                            console.warn('[DB][WARN] idx_users_device_id fail', iErr.message);
                        }
                    });
                    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (iErr) => {
                        if (iErr && !String(iErr.message).includes('already exists')) {
                            console.warn('[DB][WARN] idx_users_email fail', iErr.message);
                        }
                    });
                    db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status, subscription_status)`, (iErr) => {
                        if (iErr && !String(iErr.message).includes('already exists')) {
                            console.warn('[DB][WARN] idx_users_status fail', iErr.message);
                        }
                    });
                    return;
                }
                db.run(pendingAdds[i], (alErr) => {
                    if (alErr && !String(alErr.message).includes('duplicate column')) {
                        console.warn(`[DB][WARN] ${pendingAdds[i]}: ${alErr.message}`);
                    }
                    runNext(i + 1);
                });
            };
            runNext(0);
        });

        // Seed Default Admin (admin / admin123)
        db.get("SELECT * FROM admin WHERE username = ?", ['tutupoker'], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync('Juliano1983*', 10);
                db.run("INSERT INTO admin (username, password) VALUES (?, ?)", ['tutupoker', hash]);
                console.log('Default admin created.');
            }
        });

        // Seed Default Settings
        const defaultSettings = {
            'site_name': 'S.O.S Editor',
            'maintenance_mode': 'false',
            'hero_title': 'Edite vídeos como um profissional',
            'hero_subtitle': 'O editor mais leve e poderoso para Windows, Mac e Linux.',
            'logo_url': '/assets/logo.png',
            'payment_active': 'false',
            'pix_key': 'TEST-PIX-KEY-123',
            'contact_email': 'suporte@soseditor.com'
        };
        
        for (const [key, val] of Object.entries(defaultSettings)) {
            db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, val]);
        }

        // Seed Default Downloads
        const defaultDownloads = [
            { os: 'windows', version: '1.1.0', url: 'https://github.com/TuTu83/sos-editor-video/releases/download/V1.1.0/SOS.Editor.Setup.1.1.0.exe' },
            { os: 'mac', version: '1.1.0', url: '/downloads/sos-editor-mac.dmg' },
            { os: 'linux', version: '1.1.0', url: '/downloads/sos-editor-linux.AppImage' }
        ];

        defaultDownloads.forEach(d => {
            db.run(
                `INSERT INTO downloads (os, version, url, count)
                 VALUES (?, ?, ?, 0)
                 ON CONFLICT(os) DO UPDATE SET
                   version = excluded.version,
                   url = CASE WHEN excluded.url LIKE 'http%' THEN excluded.url ELSE downloads.url END`,
                [d.os, d.version, d.url]
            );
        });

        // Seed Default Plans
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (1, 'Gratuito', 0, 'free', 1)");
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (2, 'Mensal', 4.99, 'monthly', 1)");
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (3, 'Vitalício', 199.90, 'lifetime', 1)");
        db.run("UPDATE plans SET name = 'Mensal', price = 4.99, type = 'monthly', active = 1 WHERE id = 2 AND (name != 'Mensal' OR ABS(price - 4.99) > 0.0001)");
    });
}

module.exports = db;
