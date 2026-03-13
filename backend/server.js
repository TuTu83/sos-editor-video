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
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
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
    const settings = req.body; // { key: value, ... }
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        for (const [key, value] of Object.entries(settings)) {
            stmt.run(key, value);
        }
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
    stmt.finalize();
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

// Update Plans
app.put('/api/admin/plans', authenticateToken, (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database unavailable' });
    const { id, price, active } = req.body;
    db.run("UPDATE plans SET price = ?, active = ? WHERE id = ?", [price, active, id], function(err) {
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

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
