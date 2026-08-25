const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'sos-secret-key-change-me';

process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (err) => {
    console.error('unhandledRejection:', err && err.stack ? err.stack : err);
});

let db = null;
try {
    db = require('./database');
} catch (err) {
    console.error('Database unavailable:', err && err.message ? err.message : err);
}

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Serve static assets if needed, but preferably use S3/CDN for production
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// Health Check
app.get('/', (req, res) => {
    res.send('S.O.S Editor API is running.');
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// --- PUBLIC ROUTES ---

// Get Site Config & Content
app.get('/api/config', (req, res) => {
    if (!db) return res.json({ maintenance_mode: 'true' });
    db.all("SELECT key, value FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const config = {};
        rows.forEach(r => config[r.key] = r.value);
        res.json(config);
    });
});

// Get Plans
app.get('/api/plans', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.all("SELECT * FROM plans WHERE active = 1", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get Downloads Info
app.get('/api/downloads', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.all("SELECT os, version, url FROM downloads", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Track Visit
app.post('/api/track/visit', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const today = new Date().toISOString().split('T')[0];
    db.get("SELECT * FROM visits WHERE date = ?", [today], (err, row) => {
        if (row) {
            db.run("UPDATE visits SET count = count + 1 WHERE id = ?", [row.id]);
        } else {
            db.run("INSERT INTO visits (date, count) VALUES (?, 1)", [today]);
        }
        res.json({ success: true });
    });
});

// Track Download
app.post('/api/track/download', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { os } = req.body;
    if (!os) return res.status(400).json({ error: 'OS required' });
    
    db.run("UPDATE downloads SET count = count + 1 WHERE os = ?", [os], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Check Coupon
app.post('/api/check-coupon', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { code } = req.body;
    db.get("SELECT * FROM coupons WHERE code = ? AND active = 1", [code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Invalid coupon' });
        res.json(row);
    });
});

// --- ADMIN ROUTES ---

// Login
app.post('/api/admin/login', (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { username, password } = req.body;
    db.get("SELECT * FROM admin WHERE username = ?", [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

// Middleware for Protected Routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Get Dashboard Stats
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const stats = {};
    
    // Total Downloads
    db.get("SELECT SUM(count) as total FROM downloads", (err, row) => {
        stats.totalDownloads = row ? row.total : 0;
        
        // Total Visits
        db.get("SELECT SUM(count) as total FROM visits", (err, row) => {
            stats.totalVisits = row ? row.total : 0;
            
            // Downloads by OS
            db.all("SELECT os, count FROM downloads", (err, rows) => {
                stats.downloadsByOS = rows;
                
                // Visits History (Last 7 days)
                db.all("SELECT * FROM visits ORDER BY date DESC LIMIT 7", (err, rows) => {
                    stats.visitsHistory = rows;
                    res.json(stats);
                });
            });
        });
    });
});

// Update Settings
app.put('/api/admin/settings', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const settings = req.body || {};
    const entries = Object.entries(settings)
        .filter(([key, value]) => key && value !== undefined)
        .map(([key, value]) => [String(key), String(value)]);

    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

    db.serialize(() => {
        db.run("BEGIN IMMEDIATE TRANSACTION", (beginErr) => {
            if (beginErr) {
                stmt.finalize();
                return res.status(500).json({ error: beginErr.message });
            }

            for (const [key, value] of entries) {
                stmt.run(key, value);
            }

            db.run("COMMIT", (commitErr) => {
                stmt.finalize();

                if (commitErr) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: commitErr.message });
                }
                res.json({ success: true });
            });
        });
    });
});

// Update Download Info
app.put('/api/admin/download', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { os, version, url } = req.body;
    db.run("UPDATE downloads SET version = ?, url = ? WHERE os = ?", [version, url, os], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/admin/plans', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.all("SELECT * FROM plans ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Plans
app.put('/api/admin/plans', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { id, price, active } = req.body;
    const normalizedPrice = Number.isFinite(Number(price)) ? Number(price) : price;
    const normalizedActive = Number.isFinite(Number(active)) ? Number(active) : active;
    db.run("UPDATE plans SET price = ?, active = ? WHERE id = ?", [normalizedPrice, normalizedActive, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Manage Coupons
app.get('/api/admin/coupons', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.all("SELECT * FROM coupons", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/coupons', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { code, discount } = req.body;
    db.run("INSERT INTO coupons (code, discount, active) VALUES (?, ?, 1)", [code, discount], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.delete('/api/admin/coupons/:id', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.run("DELETE FROM coupons WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =======================================================================
// SOS EDITOR - LICENÇA / TRIAL 7 DIAS (Backend autoridade)
// =======================================================================
const TRIAL_DAYS = 7;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{10,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseIsoDate(s) {
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
}

function nowIso() { return new Date().toISOString(); }

function computeDaysHoursBetween(fromDate, toDate) {
    const ms = toDate.getTime() - fromDate.getTime();
    if (ms <= 0) return { days: 0, hours: 0, ms: 0, seconds: 0 };
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    return { days, hours, ms, seconds: totalSec };
}

function extractClientIp(req) {
    if (!req) return '127.0.0.1';
    const f1 = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
    if (f1) {
        const v = String(f1).split(',')[0].trim();
        if (v) return v;
    }
    return (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || (req.ip) || '127.0.0.1';
}

// ==== HELPERS: AUDIT LOG & ADMIN GRANTS ====
function logAudit({ adminId, action, targetType, targetId, oldValue, newValue, reason, req }) {
    try {
        if (!db) return;
        const ip = extractClientIp(req);
        const ua = req && req.headers ? String(req.headers['user-agent'] || '').slice(0, 500) : null;
        const oldStr = typeof oldValue === 'string' ? oldValue.slice(0, 8000) : JSON.stringify(oldValue || null).slice(0, 8000);
        const newStr = typeof newValue === 'string' ? newValue.slice(0, 8000) : JSON.stringify(newValue || null).slice(0, 8000);
        db.run(`INSERT INTO admin_audit_logs
            (admin_user_id, action, target_type, target_id, old_value, new_value, reason, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            adminId || null,
            String(action || '').slice(0, 80),
            targetType ? String(targetType).slice(0, 50) : null,
            targetId != null ? Number(targetId) || null : null,
            oldStr,
            newStr,
            reason ? String(reason).slice(0, 500) : null,
            ip,
            ua,
            nowIso()
        ]);
    } catch (e) {
        // Não falha request por causa de log
        if (process.env.NODE_ENV !== 'production') console.warn('[AUDIT] skip', e.message);
    }
}

function getMonthlyPlanCached(cb) {
    if (!db) return cb(null, null);
    db.get("SELECT id, name, price, type, active FROM plans WHERE type = 'monthly' AND active = 1 ORDER BY id ASC LIMIT 1", (e, r) => {
        if (e || !r) {
            db.get("SELECT id, name, price, type, active FROM plans WHERE id = 2 OR type='monthly' ORDER BY id ASC LIMIT 1", (e2, r2) => cb(e2, r2));
        } else cb(null, r);
    });
}

function getActiveGrantForUserId(userId, cb) {
    if (!db || !userId) return cb(null, null);
    db.get(`SELECT g.*, a.username AS granted_by_name, rev.username AS revoked_by_name
        FROM admin_access_grants g
        LEFT JOIN admin a ON a.id = g.granted_by_admin_id
        LEFT JOIN admin rev ON rev.id = g.revoked_by_admin_id
        WHERE g.user_id = ? AND g.active = 1
        ORDER BY g.expires_at DESC, g.id DESC LIMIT 1`, [userId], (e, grant) => {
        if (e || !grant) return cb(null, null);
        const exp = parseIsoDate(grant.expires_at);
        const now = new Date();
        if (exp && exp.getTime() > now.getTime()) return cb(null, grant);
        return cb(null, null);
    });
}

function buildLicenseResponse(userId, userRow, extras, cb) {
    if (typeof extras === 'function') { cb = extras; extras = {}; }
    getActiveGrantForUserId(userId, (_, grant) => {
        getMonthlyPlanCached((__, plan) => {
            const base = buildUserStatus(userRow, grant);
            const out = Object.assign({}, base, extras || {});
            out.plan_monthly = plan ? {
                id: plan.id,
                name: plan.name,
                price: Number(plan.price || 0),
                currency: 'BRL',
                type: plan.type,
                active: !!plan.active
            } : null;
            out.plan_monthly_price_brl = plan ? Number(plan.price || 0) : null;
            cb(null, out);
        });
    });
}

function buildUserStatus(row, activeGrant) {
    const now = new Date();
    const trialEnds = row && row.trial_ends_at ? parseIsoDate(row.trial_ends_at) : null;
    const subExpires = row && row.subscription_expires_at ? parseIsoDate(row.subscription_expires_at) : null;
    const userStatus = (row && row.status) || 'active';
    const subStatus = (row && row.subscription_status) || 'none';
    const grant = activeGrant || null;

    let status = 'unknown';
    let allowed = false;
    let trial_active = false;
    let days_remaining = 0;
    let hours_remaining = 0;
    let subscription_active = false;
    let expires_at = null;
    let grant_active = false;
    let grant_expires_at = null;
    let grant_granted_at = null;
    let grant_reason = null;
    let grant_id = null;

    if (grant) {
        const ge = parseIsoDate(grant.expires_at);
        if (ge) {
            grant_active = true;
            grant_expires_at = ge.toISOString();
            grant_granted_at = grant.granted_at || null;
            grant_reason = grant.reason || null;
            grant_id = grant.id || null;
            expires_at = grant_expires_at;
        }
    }

    if (userStatus && String(userStatus).toLowerCase() === 'blocked') {
        status = 'blocked';
        allowed = false;
        grant_active = false;
    } else if (grant_active) {
        status = 'admin_override_active';
        allowed = true;
        const dh = computeDaysHoursBetween(now, parseIsoDate(grant_expires_at));
        days_remaining = dh.days;
        hours_remaining = dh.hours;
    } else if (subStatus === 'active' && subExpires && subExpires.getTime() > now.getTime()) {
        subscription_active = true;
        status = 'subscription_active';
        allowed = true;
        const dh = computeDaysHoursBetween(now, subExpires);
        days_remaining = dh.days;
        hours_remaining = dh.hours;
        expires_at = subExpires.toISOString();
    } else if (trialEnds && trialEnds.getTime() > now.getTime()) {
        trial_active = true;
        status = 'trial';
        allowed = true;
        const dh = computeDaysHoursBetween(now, trialEnds);
        days_remaining = dh.days;
        hours_remaining = dh.hours;
        expires_at = trialEnds.toISOString();
    } else if (trialEnds) {
        status = 'trial_expired';
        allowed = false;
        trial_active = false;
        days_remaining = 0;
        hours_remaining = 0;
        expires_at = trialEnds.toISOString();
    } else {
        status = 'no_trial';
        allowed = false;
    }

    return {
        user_id: row && row.id ? Number(row.id) : null,
        allowed,
        status,
        trial_active,
        days_remaining,
        hours_remaining,
        expires_at,
        subscription_active,
        subscription_status: subStatus,
        subscription_expires_at: subExpires ? subExpires.toISOString() : null,
        user_status: userStatus,
        trial_ends_at: trialEnds ? trialEnds.toISOString() : null,
        trial_started_at: (row && row.trial_started_at) || null,
        created_at: (row && row.created_at) || null,
        last_seen_at: (row && row.last_seen_at) || null,
        device_id: (row && row.device_id) || null,
        email: (row && row.email) || null,
        display_name: (row && row.display_name) || null,
        plan_id: (row && row.plan_id) || null,
        grant_active,
        grant_expires_at,
        grant_granted_at,
        grant_reason,
        grant_id
    };
}

const licenseActivateHits = new Map();
function rateLimitActivateIp(ip, opts) {
    const maxPerHour = 15;
    const windowMs = 60 * 60 * 1000;
    const key = 'license_activate_' + String(ip || 'unknown');
    const nowMs = Date.now();
    const list = licenseActivateHits.get(key) || [];
    const cleaned = list.filter(ts => nowMs - ts < windowMs);
    if (cleaned.length >= maxPerHour) {
        licenseActivateHits.set(key, cleaned);
        return { blocked: true, remaining: 0, resetMs: windowMs - (nowMs - Math.min.apply(null, cleaned)) };
    }
    cleaned.push(nowMs);
    licenseActivateHits.set(key, cleaned);
    if (licenseActivateHits.size > 20000) licenseActivateHits.clear();
    return { blocked: false, remaining: maxPerHour - cleaned.length };
}

app.get('/api/videos/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id || id.length < 4 || id.length > 128) {
        return res.status(400).json({ error: 'ID do vídeo inválido.' });
    }
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    db.get(
        "SELECT video_id, title, filename, size_bytes, mime_type, storage_url, status, created_at FROM videos WHERE video_id = ? LIMIT 1",
        [id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Vídeo não encontrado.' });
            if (String(row.status || '').toLowerCase() !== 'uploaded') {
                return res.status(404).json({ error: 'Vídeo não está disponível.' });
            }
            return res.json({
                video_id: row.video_id,
                title: row.title,
                filename: row.filename,
                size_bytes: row.size_bytes,
                mime_type: row.mime_type,
                url: row.storage_url,
                created_at: row.created_at
            });
        }
    );
});

app.post('/api/license/activate', (req, res) => {
    try {
        const body = req.body || {};
        const deviceId = String(body.device_id || '').trim();
        const emailRaw = String(body.email || '').trim();
        const appVersion = String(body.app_version || '').slice(0, 64);
        const displayName = String(body.display_name || '').slice(0, 120);

        if (!deviceId || !DEVICE_ID_PATTERN.test(deviceId)) {
            return res.status(400).json({ error: 'Identificador de dispositivo inválido.' });
        }

        const ip = extractClientIp(req);
        const rl = rateLimitActivateIp(ip);
        if (rl.blocked) {
            return res.status(429).json({
                error: 'Muitas requisições. Aguarde um momento e tente novamente.',
                retry_after_seconds: Math.ceil((rl.resetMs || 3600000) / 1000)
            });
        }

        const email = emailRaw && EMAIL_PATTERN.test(emailRaw) ? emailRaw : null;
        const created = nowIso();

        if (!db) return res.status(503).json({ error: 'Database unavailable' });

        db.get("SELECT * FROM users WHERE device_id = ? LIMIT 1", [deviceId], (selErr, row) => {
            if (selErr) return res.status(500).json({ error: selErr.message });
            if (row) {
                db.run(
                    "UPDATE users SET last_seen_at = ? WHERE id = ?",
                    [created, row.id],
                    () => {
                        const merged = Object.assign({}, row, { last_seen_at: created });
                        buildLicenseResponse(row.id, merged, { created_new: false }, (_, out) => res.json(out));
                    }
                );
                return;
            }

            db.get("SELECT COUNT(*) AS cnt FROM users WHERE (ip_created = ? OR device_id LIKE ?) AND trial_started_at IS NOT NULL",
                [ip || '', '%' + String(deviceId || '').slice(0, 10) + '%'],
                (cntErr, cntRow) => {
                    const trialStart = new Date();
                    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 3600 * 1000);
                    const ts = trialStart.toISOString();
                    const te = trialEnd.toISOString();

                    db.run(
                        `INSERT INTO users
                         (device_id, email, display_name, created_at, trial_started_at, trial_ends_at, status, subscription_status, last_seen_at, ip_created, plan_id)
                         VALUES (?, ?, ?, ?, ?, ?, 'active', 'none', ?, ?, 1)`,
                        [deviceId, email, displayName || null, created, ts, te, created, ip || null],
                        function (insErr) {
                            if (insErr) {
                                if (String(insErr.message || '').includes('UNIQUE constraint failed: users.device_id')) {
                                    db.get("SELECT * FROM users WHERE device_id = ? LIMIT 1", [deviceId], (e2, r2) => {
                                        if (e2) return res.status(500).json({ error: e2.message });
                                        if (!r2) return res.status(500).json({ error: 'Falha ao ativar licença.' });
                                        buildLicenseResponse(r2.id, r2, { created_new: false, raced: true }, (_, out) => res.json(out));
                                    });
                                    return;
                                }
                                return res.status(500).json({ error: insErr.message });
                            }
                            const newRow = {
                                id: this.lastID,
                                device_id: deviceId,
                                email: email,
                                display_name: displayName || null,
                                created_at: created,
                                trial_started_at: ts,
                                trial_ends_at: te,
                                status: 'active',
                                subscription_status: 'none',
                                last_seen_at: created,
                                plan_id: 1
                            };
                            buildLicenseResponse(this.lastID, newRow, { created_new: true }, (_, out) => res.status(201).json(out));
                        }
                    );
                }
            );
        });
    } catch (e) {
        return res.status(500).json({ error: 'Erro interno. ' + (e && e.message ? e.message : '') });
    }
});

app.get('/api/license/status', (req, res) => {
    const deviceId = String(req.query.device_id || '').trim();
    if (!deviceId || !DEVICE_ID_PATTERN.test(deviceId)) {
        return res.status(400).json({ error: 'Identificador de dispositivo inválido.' });
    }
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    db.get("SELECT * FROM users WHERE device_id = ? LIMIT 1", [deviceId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            // Ainda assim retorna preço mensal do plano público para Electron poder exibir antes de ativar
            getMonthlyPlanCached((__, plan) => {
                return res.status(404).json({
                    allowed: false,
                    status: 'unknown_device',
                    message: 'Dispositivo não encontrado. Ative o aplicativo primeiro.',
                    plan_monthly: plan ? {
                        id: plan.id, name: plan.name,
                        price: Number(plan.price || 0),
                        currency: 'BRL', type: plan.type, active: !!plan.active
                    } : null,
                    plan_monthly_price_brl: plan ? Number(plan.price || 0) : null
                });
            });
            return;
        }
        db.run("UPDATE users SET last_seen_at = ? WHERE id = ?", [nowIso(), row.id]);
        buildLicenseResponse(row.id, Object.assign({}, row, { last_seen_at: nowIso() }), (_, out) => res.json(out));
    });
});

// ============= ADMIN USERS (PROTEGIDOS JWT) =============
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const q = req.query.q ? String(req.query.q).toLowerCase() : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const where = [];
    const args = [];
    if (statusFilter) {
        if (statusFilter === 'trial')          { where.push("(subscription_status IS NULL OR subscription_status IN ('none','expired')) AND trial_ends_at IS NOT NULL AND datetime(trial_ends_at) > datetime('now')"); }
        else if (statusFilter === 'trial_expired') { where.push("(subscription_status IS NULL OR subscription_status IN ('none','expired')) AND trial_ends_at IS NOT NULL AND datetime(trial_ends_at) <= datetime('now')"); }
        else if (statusFilter === 'active_subscription') { where.push("subscription_status = 'active' AND datetime(subscription_expires_at) > datetime('now')"); }
        else if (statusFilter === 'expired_subscription') { where.push("subscription_status = 'expired'"); }
        else if (statusFilter === 'blocked') { where.push("status = 'blocked'"); }
    }
    if (q) {
        where.push("(LOWER(COALESCE(email,'')) LIKE ? OR LOWER(COALESCE(device_id,'')) LIKE ? OR LOWER(COALESCE(display_name,'')) LIKE ?)");
        args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    db.get(`SELECT COUNT(*) AS cnt FROM users${whereSql}`, args, (errCnt, cntRow) => {
        if (errCnt) return res.status(500).json({ error: errCnt.message });
        db.all(
            `SELECT id, device_id, email, display_name, created_at, trial_started_at, trial_ends_at,
                    status, subscription_status, subscription_expires_at, last_seen_at, plan_id, ip_created
             FROM users${whereSql}
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            args.concat([limit, offset]),
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({
                    total: (cntRow && cntRow.cnt) || 0,
                    page,
                    limit,
                    users: Array.isArray(rows) ? rows : []
                });
            }
        );
    });
});

app.get('/api/admin/users/:id', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const id = parseInt(req.params.id, 10);
    if (!id || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Usuário não encontrado.' });
        if (row && row.password) { delete row.password; }
        db.all(`SELECT g.*, a.username AS granted_by_name, rv.username AS revoked_by_name
            FROM admin_access_grants g
            LEFT JOIN admin a ON a.id = g.granted_by_admin_id
            LEFT JOIN admin rv ON rv.id = g.revoked_by_admin_id
            WHERE g.user_id = ? ORDER BY g.id DESC LIMIT 20`, [id], (ge, grants) => {
            buildLicenseResponse(id, row, {}, (_, stat) => {
                const pub = Object.assign({}, row);
                if (pub.password) delete pub.password;
                return res.json(Object.assign({}, pub, {
                    _computed: stat,
                    _grants: Array.isArray(grants) ? grants : []
                }));
            });
        });
    });
});

app.put('/api/admin/users/:id/status', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const id = parseInt(req.params.id, 10);
    if (!id || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
    const body = req.body || {};
    const newStatus = body.status ? String(body.status).toLowerCase() : null;
    const newSub = body.subscription_status ? String(body.subscription_status).toLowerCase() : null;
    const newExp = body.subscription_expires_at ? String(body.subscription_expires_at).slice(0, 32) : null;
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;

    if (!newStatus && !newSub && !newExp) {
        return res.status(400).json({ error: 'Nenhum campo fornecido para atualizar.' });
    }

    const sets = [];
    const args = [];
    if (['active','blocked','disabled'].includes(newStatus)) { sets.push("status = ?"); args.push(newStatus); }
    if (['none','active','expired','pending','canceled'].includes(newSub)) { sets.push("subscription_status = ?"); args.push(newSub); }
    if (newExp) {
        if (!parseIsoDate(newExp)) return res.status(400).json({ error: 'Data de expiração inválida (use ISO).' });
        sets.push("subscription_expires_at = ?"); args.push(newExp);
    }
    args.push(id);

    db.get("SELECT * FROM users WHERE id = ?", [id], (eBefore, before) => {
        if (eBefore) return res.status(500).json({ error: eBefore.message });
        if (!before) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const oldSlice = before ? {
            status: before.status, subscription_status: before.subscription_status,
            subscription_expires_at: before.subscription_expires_at
        } : null;
        db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (!this.changes) return res.status(404).json({ error: 'Usuário não encontrado.' });
            db.get("SELECT * FROM users WHERE id = ?", [id], (e2, row) => {
                const newSlice = row ? {
                    status: row.status, subscription_status: row.subscription_status,
                    subscription_expires_at: row.subscription_expires_at
                } : null;
                logAudit({
                    adminId: req.user && (req.user.id || req.user.adminId || req.user.sub) ? Number(req.user.id || req.user.adminId || req.user.sub) : null,
                    action: 'user.status.update',
                    targetType: 'user',
                    targetId: id,
                    oldValue: oldSlice,
                    newValue: newSlice,
                    reason: reason,
                    req
                });
                if (e2) return res.json({ success: true, changes: this.changes });
                buildLicenseResponse(id, row, {}, (_, comp) => {
                    const pub = Object.assign({}, row);
                    if (pub.password) delete pub.password;
                    return res.json({ success: true, changes: this.changes, user: Object.assign({}, pub, { _computed: comp }) });
                });
            });
        });
    });
});

// ======= ADMIN PLANS (AUTORIDADE DE PREÇO) =======
app.put('/api/admin/plans/:id', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const id = parseInt(req.params.id, 10);
    if (!id || id <= 0) return res.status(400).json({ error: 'ID de plano inválido.' });
    const body = req.body || {};
    const name = body.name ? String(body.name).slice(0, 100) : null;
    const priceRaw = body.price;
    const type = body.type ? String(body.type).slice(0, 30) : null;
    const active = (typeof body.active === 'boolean') ? (body.active ? 1 : 0) : null;
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    if (!name && priceRaw == null && !type && active == null) {
        return res.status(400).json({ error: 'Nenhum campo fornecido.' });
    }
    if (priceRaw != null) {
        const price = Number(priceRaw);
        if (isNaN(price) || price < 0 || price > 999999) {
            return res.status(400).json({ error: 'Preço inválido. Use um número ≥ 0.' });
        }
    }
    db.get("SELECT * FROM plans WHERE id = ?", [id], (eBef, bef) => {
        if (eBef) return res.status(500).json({ error: eBef.message });
        if (!bef) return res.status(404).json({ error: 'Plano não encontrado.' });
        const sets = []; const args = [];
        if (name) { sets.push("name = ?"); args.push(name); }
        if (priceRaw != null) { sets.push("price = ?"); args.push(Number(priceRaw)); }
        if (type) { sets.push("type = ?"); args.push(type); }
        if (active != null) { sets.push("active = ?"); args.push(active); }
        args.push(id);
        db.run(`UPDATE plans SET ${sets.join(', ')} WHERE id = ?`, args, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM plans WHERE id = ?", [id], (eAft, aft) => {
                logAudit({
                    adminId: req.user && (req.user.id || req.user.adminId || req.user.sub) ? Number(req.user.id || req.user.adminId || req.user.sub) : null,
                    action: aft && aft.id === 2 ? 'plan.update_price.monthly' : 'plan.update',
                    targetType: 'plan', targetId: id,
                    oldValue: bef, newValue: aft || null,
                    reason, req
                });
                return res.json({ success: true, changes: this.changes, plan: aft || null });
            });
        });
    });
});

// ======= ADMIN ACCESS GRANTS (LIBERAÇÃO MANUAL) =======
app.get('/api/admin/access-grants', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
    const onlyActive = req.query.active ? String(req.query.active) === '1' || String(req.query.active).toLowerCase() === 'true' : false;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;
    const where = []; const args = [];
    if (userId) { where.push("g.user_id = ?"); args.push(userId); }
    if (onlyActive) { where.push("g.active = 1"); }
    const wsql = where.length ? " WHERE " + where.join(' AND ') : '';
    db.get(`SELECT COUNT(*) AS cnt FROM admin_access_grants g${wsql}`, args, (ec, cntRow) => {
        if (ec) return res.status(500).json({ error: ec.message });
        db.all(`SELECT g.*, a.username AS granted_by_name, rv.username AS revoked_by_name,
                    u.email AS user_email, u.device_id AS user_device, u.display_name AS user_name
                FROM admin_access_grants g
                LEFT JOIN admin a ON a.id = g.granted_by_admin_id
                LEFT JOIN admin rv ON rv.id = g.revoked_by_admin_id
                LEFT JOIN users u ON u.id = g.user_id
                ${wsql}
                ORDER BY g.id DESC LIMIT ? OFFSET ?`, args.concat([limit, offset]), (e, rows) => {
            if (e) return res.status(500).json({ error: e.message });
            return res.json({ total: (cntRow && cntRow.cnt) || 0, page, limit, grants: Array.isArray(rows) ? rows : [], rows: Array.isArray(rows) ? rows : [] });
        });
    });
});

app.post('/api/admin/access-grants', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const body = req.body || {};
    const userId = parseInt(body.user_id, 10);
    const days = body.days ? parseInt(body.days, 10) : null;
    const expiresAt = body.expires_at ? String(body.expires_at).slice(0, 40) : null;
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    if (!userId || userId <= 0) return res.status(400).json({ error: 'ID do usuário inválido.' });
    if (!days && !expiresAt) return res.status(400).json({ error: 'Forneça days (7/30/90/365) ou expires_at ISO.' });
    const presets = [7, 30, 90, 180, 365];
    let expDate = null;
    if (expiresAt) {
        expDate = parseIsoDate(expiresAt);
        if (!expDate) return res.status(400).json({ error: 'expires_at inválido (ISO 8601).' });
    } else if (days) {
        if (!presets.includes(days) && (days < 1 || days > 3650)) {
            return res.status(400).json({ error: `days inválido. Valores aceitos: 7, 30, 90, 180, 365 ou 1..3650 dias custom.` });
        }
        expDate = new Date(Date.now() + Math.floor(days) * 86400 * 1000);
    }
    const adminId = req.user && (req.user.id || req.user.adminId || req.user.sub) ? Number(req.user.id || req.user.adminId || req.user.sub) : null;
    db.get("SELECT id, email, display_name, status FROM users WHERE id = ?", [userId], (eu, u) => {
        if (eu) return res.status(500).json({ error: eu.message });
        if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const now = nowIso();
        db.run(`INSERT INTO admin_access_grants
            (user_id, granted_by_admin_id, granted_at, expires_at, reason, active, revoked_at, revoked_by_admin_id, revoked_reason)
            VALUES (?, ?, ?, ?, ?, 1, NULL, NULL, NULL)`,
        [userId, adminId || null, now, expDate.toISOString(), reason || null],
        function(insErr) {
            if (insErr) return res.status(500).json({ error: insErr.message });
            const grantId = this.lastID;
            logAudit({
                adminId,
                action: 'grant.create',
                targetType: 'grant',
                targetId: grantId,
                oldValue: null,
                newValue: { id: grantId, user_id: userId, expires_at: expDate.toISOString(), days: days || null, reason },
                reason, req
            });
            db.get(`SELECT g.*, a.username AS granted_by_name FROM admin_access_grants g
                    LEFT JOIN admin a ON a.id = g.granted_by_admin_id WHERE g.id = ?`, [grantId], (eg, g) => {
                return res.status(201).json({ success: true, grant: g || { id: grantId }, expires_at: expDate.toISOString(), days_used: days || null });
            });
        });
    });
});

app.post('/api/admin/access-grants/:id/revoke', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const id = parseInt(req.params.id, 10);
    if (!id || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
    const body = req.body || {};
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    db.get("SELECT * FROM admin_access_grants WHERE id = ?", [id], (eb, bef) => {
        if (eb) return res.status(500).json({ error: eb.message });
        if (!bef) return res.status(404).json({ error: 'Liberação não encontrada.' });
        if (!bef.active) return res.status(409).json({ error: 'Liberação já está revogada/inativa.' });
        const adminId = req.user && (req.user.id || req.user.adminId || req.user.sub) ? Number(req.user.id || req.user.adminId || req.user.sub) : null;
        const now = nowIso();
        db.run(`UPDATE admin_access_grants SET active = 0, revoked_at = ?, revoked_by_admin_id = ?, revoked_reason = ? WHERE id = ?`,
            [now, adminId || null, reason || null, id],
            function(updErr) {
                if (updErr) return res.status(500).json({ error: updErr.message });
                db.get("SELECT * FROM admin_access_grants WHERE id = ?", [id], (ea, aft) => {
                    logAudit({
                        adminId, action: 'grant.revoke', targetType: 'grant', targetId: id,
                        oldValue: bef, newValue: aft || null, reason, req
                    });
                    return res.json({ success: true, revoked: true, changes: this.changes, grant: aft || null });
                });
            }
        );
    });
});

// ======= ADMIN AUDIT LOGS =======
app.get('/api/admin/audit-logs', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const action = req.query.action ? String(req.query.action).slice(0, 80) : null;
    const targetType = req.query.target_type ? String(req.query.target_type).slice(0, 50) : null;
    const targetId = req.query.target_id ? parseInt(req.query.target_id, 10) : null;
    const adminIdQ = req.query.admin_id ? parseInt(req.query.admin_id, 10) : null;
    const q = req.query.q ? String(req.query.q).toLowerCase() : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(20, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const where = []; const args = [];
    if (action) { where.push("L.action = ?"); args.push(action); }
    if (targetType) { where.push("L.target_type = ?"); args.push(targetType); }
    if (targetId) { where.push("L.target_id = ?"); args.push(targetId); }
    if (adminIdQ) { where.push("L.admin_user_id = ?"); args.push(adminIdQ); }
    if (q) { where.push("(LOWER(COALESCE(L.action,'')) LIKE ? OR LOWER(COALESCE(L.old_value,'')) LIKE ? OR LOWER(COALESCE(L.new_value,'')) LIKE ? OR LOWER(COALESCE(L.reason,'')) LIKE ?)"); args.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
    const wsql = where.length ? " WHERE " + where.join(' AND ') : '';
    db.get(`SELECT COUNT(*) AS cnt FROM admin_audit_logs L${wsql}`, args, (ec, cnt) => {
        if (ec) return res.status(500).json({ error: ec.message });
        db.all(`SELECT L.*, a.username AS admin_username
                FROM admin_audit_logs L LEFT JOIN admin a ON a.id = L.admin_user_id
                ${wsql} ORDER BY L.id DESC LIMIT ? OFFSET ?`,
            args.concat([limit, offset]), (e, rows) => {
            if (e) return res.status(500).json({ error: e.message });
            return res.json({ total: (cnt && cnt.cnt) || 0, page, limit, logs: Array.isArray(rows) ? rows : [], rows: Array.isArray(rows) ? rows : [] });
        });
    });
});

// =======================================================================
// SOS EDITOR - PUBLICAÇÃO DE VÍDEOS (Cloudflare R2 / Railway)
// =======================================================================
const MAX_UPLOAD_BYTES = (() => {
    const v = parseInt(process.env.MAX_UPLOAD_BYTES, 10);
    if (!isNaN(v) && v > 0) return v;
    return 4 * 1024 * 1024 * 1024;
})();

const ALLOWED_MIMES = (() => {
    if (process.env.ALLOWED_MIMES && process.env.ALLOWED_MIMES.trim().length > 0) {
        return process.env.ALLOWED_MIMES.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    return [
        'video/mp4',
        'video/webm',
        'video/x-matroska',
        'video/quicktime',
        'video/x-msvideo'
    ];
})();

const SAFE_EXT_MAP = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi'
};

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || '').trim();
const R2_PUBLIC_URL_PREFIX = (process.env.R2_PUBLIC_URL_PREFIX || '').trim().replace(/\/$/, '');

const R2_IS_CONFIGURED =
    R2_ACCOUNT_ID.length > 0 &&
    R2_ACCESS_KEY_ID.length > 0 &&
    R2_SECRET_ACCESS_KEY.length > 0 &&
    R2_BUCKET_NAME.length > 0;

let s3Client = null;
if (R2_IS_CONFIGURED) {
    try {
        const { S3Client } = require('@aws-sdk/client-s3');
        s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY
            },
            forcePathStyle: true
        });
    } catch (e) {
        console.error('[R2] Failed to initialize S3Client:', e.message);
        s3Client = null;
    }
} else {
    console.warn('[R2] Credenciais R2 não detectadas. POST /api/videos/upload retornará 503 até serem configuradas.');
}

const multer = require('multer');

const multerStorage = multer.memoryStorage();
const upload = multer({
    storage: multerStorage,
    limits: {
        fileSize: MAX_UPLOAD_BYTES,
        files: 1,
        fields: 5,
        fieldSize: 64 * 1024
    }
});

function bufferToStream(buf) {
    const { Readable } = require('stream');
    return Readable.from(buf);
}

function sanitizeFilename(name) {
    if (!name) return 'video';
    let base = path.basename(String(name));
    base = base.replace(/[^A-Za-z0-9._-]/g, '_');
    base = base.replace(/[_\s-]+/g, '_').replace(/^_|_$/g, '');
    return base.length > 0 ? base : 'video';
}

function safeExtFromMime(mime) {
    if (!mime) return null;
    const m = String(mime).toLowerCase();
    return SAFE_EXT_MAP[m] || null;
}

function generateVideoId() {
    return crypto.randomBytes(8).toString('base64url');
}

function extractClientIp(req) {
    try {
        const fwd = req.headers['x-forwarded-for'];
        if (fwd) {
            const parts = String(fwd).split(',');
            if (parts && parts.length > 0) return String(parts[0]).trim();
        }
        const real = req.headers['x-real-ip'];
        if (real) return String(real).trim();
        if (req.ip) return String(req.ip);
        if (req.socket && req.socket.remoteAddress) return String(req.socket.remoteAddress);
    } catch (_) {}
    return null;
}

app.post('/api/videos/upload', (req, res, next) => {
    const contentLen = req.headers['content-length'];
    if (contentLen) {
        const len = parseInt(contentLen, 10);
        if (!isNaN(len) && len > MAX_UPLOAD_BYTES) {
            return res.status(413).json({
                error: `Arquivo muito grande. Tamanho máximo permitido: ${MAX_UPLOAD_BYTES} bytes (${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB).`
            });
        }
    }

    if (!R2_IS_CONFIGURED || !s3Client) {
        return res.status(503).json({
            error: 'Integração R2 ainda não configurada no servidor.'
        });
    }

    next();
}, (req, res) => {
    upload.single('video')(req, res, async (err) => {
        if (err) {
            if (err && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    error: `Arquivo muito grande. Tamanho máximo permitido: ${MAX_UPLOAD_BYTES} bytes (${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB).`
                });
            }
            return res.status(400).json({ error: 'Erro ao receber upload: ' + (err.message || String(err)) });
        }

        try {
            if (!req.file || !req.file.buffer || req.file.buffer.length < 1024) {
                return res.status(400).json({ error: 'Campo "video" ausente ou arquivo inválido/vazio.' });
            }

            const titleRaw = req.body && req.body.title ? String(req.body.title) : '';
            const title = titleRaw.length > 200 ? titleRaw.slice(0, 200) : titleRaw;

            const originalFilename = sanitizeFilename(req.file.originalname || 'video');
            const sizeBytes = req.file.buffer.length;

            if (sizeBytes > MAX_UPLOAD_BYTES) {
                return res.status(413).json({
                    error: `Arquivo muito grande. Tamanho máximo permitido: ${MAX_UPLOAD_BYTES} bytes (${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB).`
                });
            }

            let detectedMime = null;
            try {
                const FileType = require('file-type');
                const peek = req.file.buffer.slice(0, Math.min(4100, req.file.buffer.length));
                const ftr = FileType ? (FileType.fromBuffer ? await FileType.fromBuffer(peek) : null) : null;
                if (ftr && ftr.mime) detectedMime = String(ftr.mime).toLowerCase();
            } catch (ftErr) {
                console.warn('[R2] file-type detect fail:', ftErr.message);
            }

            let declaredMime = req.file.mimetype ? String(req.file.mimetype).toLowerCase() : null;
            const mimeToUse = detectedMime || declaredMime;

            if (!mimeToUse || ALLOWED_MIMES.indexOf(mimeToUse) === -1) {
                return res.status(415).json({
                    error: 'Formato de arquivo não suportado. Use um dos seguintes formatos de vídeo: ' + ALLOWED_MIMES.join(', '),
                    detected: detectedMime,
                    declared: declaredMime
                });
            }

            let ext = safeExtFromMime(mimeToUse);
            if (!ext) {
                const origExt = path.extname(originalFilename).replace(/^\./, '').toLowerCase();
                ext = /^(mp4|webm|mkv|mov|avi)$/.test(origExt) ? origExt : 'mp4';
            }

            const video_id = generateVideoId();
            const r2_key = `videos/${video_id}.${ext}`;
            const storage_url = R2_PUBLIC_URL_PREFIX
                ? `${R2_PUBLIC_URL_PREFIX}/${r2_key}`
                : null;

            try {
                const { Upload } = require('@aws-sdk/lib-storage');
                const { PutObjectCommand } = require('@aws-sdk/client-s3');

                const streamBody = bufferToStream(req.file.buffer);

                const parallelUploads3 = new Upload({
                    client: s3Client,
                    params: {
                        Bucket: R2_BUCKET_NAME,
                        Key: r2_key,
                        Body: streamBody,
                        ContentType: mimeToUse,
                        ContentLength: sizeBytes,
                        CacheControl: 'public, max-age=31536000, immutable',
                        Metadata: {
                            'video-id': video_id,
                            'original-filename': encodeURIComponent(originalFilename),
                            'title': encodeURIComponent(title || 'untitled')
                        }
                    },
                    queueSize: 4,
                    partSize: 8 * 1024 * 1024,
                    leavePartsOnError: false
                });

                await parallelUploads3.done();
            } catch (r2Err) {
                console.error('[R2] Upload to R2 failed:', r2Err && r2Err.stack ? r2Err.stack : r2Err);
                return res.status(502).json({
                    error: 'Falha ao enviar vídeo para o armazenamento. Tente novamente em alguns instantes. ' +
                           (r2Err && r2Err.message ? `Detalhe: ${r2Err.message}` : '')
                });
            }

            const nowIso = new Date().toISOString();
            const publicUrl = storage_url || null;
            const uploaderIp = extractClientIp(req);

            try {
                if (db) {
                    db.run(
                        `INSERT INTO videos
                         (video_id, title, filename, size_bytes, mime_type, storage_url, r2_key, status, created_at, uploader_ip)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            video_id,
                            title,
                            originalFilename,
                            sizeBytes,
                            mimeToUse,
                            storage_url,
                            r2_key,
                            'uploaded',
                            nowIso,
                            uploaderIp
                        ],
                        function (dbErr) {
                            if (dbErr) console.warn('[R2] DB insert videos failed:', dbErr.message);
                        }
                    );
                }
            } catch (dbCatch) {
                console.warn('[R2] DB insert catch:', dbCatch.message);
            }

            return res.status(201).json({
                url: publicUrl,
                video_id,
                size: sizeBytes,
                created_at: nowIso,
                mime_type: mimeToUse,
                filename: originalFilename,
                title
            });
        } catch (topErr) {
            console.error('[R2] /api/videos/upload unexpected error:', topErr && topErr.stack ? topErr.stack : topErr);
            return res.status(500).json({
                error: 'Erro interno no servidor durante a publicação. ' +
                       (topErr && topErr.message ? `Detalhe: ${topErr.message}` : '')
            });
        }
    });
});

if (require.main === module) {
    console.log(`Boot: node=${process.version} port=${PORT} env=${process.env.NODE_ENV || ''} railway=${process.env.RAILWAY_ENVIRONMENT ? 'yes' : 'no'}`);
    if (R2_IS_CONFIGURED) {
        console.log(`[R2] Configurado: bucket=${R2_BUCKET_NAME} publicPrefix=${R2_PUBLIC_URL_PREFIX || '(não definido)'} maxUpload=${(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB`);
    } else {
        console.log('[R2] Não configurado (aguarda variáveis de ambiente no Railway). POST /api/videos/upload responderá 503.');
    }
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
