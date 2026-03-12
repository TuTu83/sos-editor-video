const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = (() => {
    if (process.env.DATABASE_PATH) return path.resolve(process.env.DATABASE_PATH);
    if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') return '/tmp/database.sqlite';
    return path.resolve(__dirname, 'database.sqlite');
})();

try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
} catch (_) {
}

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

        // 7. Users Table (Future Use)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            plan_id INTEGER,
            created_at TEXT
        )`);

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
            { os: 'windows', version: '1.0.5', url: 'https://github.com/TuTu83/sos-editor-video/releases/download/V1.0.5/SOS.Editor.Setup.1.0.5.exe' },
            { os: 'mac', version: '1.0.0', url: '/downloads/sos-editor-mac.dmg' },
            { os: 'linux', version: '1.0.0', url: '/downloads/sos-editor-linux.AppImage' }
        ];

        defaultDownloads.forEach(d => {
            db.run(
                `INSERT INTO downloads (os, version, url, count)
                 VALUES (?, ?, ?, 0)
                 ON CONFLICT(os) DO UPDATE SET
                   version = excluded.version,
                   url = excluded.url`,
                [d.os, d.version, d.url]
            );
        });

        // Seed Default Plans
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (1, 'Gratuito', 0, 'free', 1)");
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (2, 'Mensal', 29.90, 'monthly', 1)");
        db.run("INSERT OR IGNORE INTO plans (id, name, price, type, active) VALUES (3, 'Vitalício', 199.90, 'lifetime', 1)");
    });
}

module.exports = db;
