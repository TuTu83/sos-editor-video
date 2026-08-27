import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { z } from 'zod';
import type { Env } from './types';
import {
  extractBearer, signAdminToken, verifyAdminToken, verifyPassword,
} from './lib/auth';
import {
  getAllPlans, getMonthlyPlan, getPlanById, updatePlan,
  getUserByDevice, getUserById, createUserDevice, touchUserLastSeen,
  getActiveGrantForUserId, buildUserStatus, updateUserStatus,
  listUsers, listGrants, createGrant, getGrantById, revokeGrant,
  logAudit, listAuditLogs, getUserByEmail,
  getAllDownloads, getDownloadByOs, updateDownload, incrementDownloadCount,
  getSetting, getSettingInt, getSettingBool,
} from './lib/db';
import {
  addDaysIso, extractClientIp, isValidMimeVideo, nowIso, parseIsoDate, readUserAgent,
} from './lib/util';
// AWS SDK para gerar Presigned PUT URLs do R2 (upload direto Electron → R2, sem passar pelo Worker)
// Obriga a existência de credenciais R2 via wrangler secret apenas para vídeos > 80MB.
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = new Hono<{ Bindings: Env }>();

// ============== CORS Whitelist ==============
const CORS_ALLOWLIST = [
  /^https:\/\/.*\.workers\.dev$/i,
  /^https:\/\/sos-editor-api\.soseditor\.workers\.dev$/i,
  /^https:\/\/api\.soseditor\.com\.br$/i,
  /^https:\/\/soseditor\.com\.br$/i,
  /^https:\/\/.*\.soseditor\.com\.br$/i,
  /^https:\/\/tutu83\.github\.io$/i,
  /^https:\/\/.*\.github\.io$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^file:\/\/.*/i, // Electron renderer
  /^chrome-extension:\/\//i,
];
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return true; // Electron/CLI sem origin header
  for (const r of CORS_ALLOWLIST) if (r.test(origin)) return true;
  return false;
};
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Range'],
  credentials: false,
  maxAge: 86400,
  exposeHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag', 'Last-Modified'],
}));

// ============== Helpers Auth Middleware ==================
const requireAdminAuth = async (c: any, next: any) => {
  const token = extractBearer(c.req.raw);
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' });
  const payload = await verifyAdminToken(c.env, token);
  if (!payload || !payload.admin_id) throw new HTTPException(401, { message: 'Unauthorized' });
  c.set('adminId', Number(payload.admin_id));
  c.set('adminUsername', payload.username || 'unknown');
  await next();
};

const getAdminCtx = (c: any) => ({
  adminId: Number(c.get('adminId') || 0),
  adminUsername: String(c.get('adminUsername') || ''),
});

const jsonError = (status: number, error: string, extra?: Record<string, unknown>) => {
  return new Response(JSON.stringify({ status: 'error', error, ...(extra || {}) }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

const getCtx = (c: any) => ({
  ip: extractClientIp(c.req.raw),
  ua: readUserAgent(c.req.raw),
});

// ============== API ROOT / HEALTH ==================
app.get('/', (c) => c.json({
  status: 'ok',
  service: 'SOS Editor Cloudflare Worker API',
  version: '1.1.0',
  env: c.env.ENVIRONMENT || 'production',
  timestamp: nowIso(),
}));

app.get('/api/health', (c) => c.json({ ok: true, now: nowIso() }));

// ============== R2 CREDENTIALS DEBUG (NÃO EXPÕE SECRETS, só preview/tamanho) ==================
// Endpoint público leve para diagnosticar SignatureDoesNotMatch / Invalid URL sem revelar valores.
// Retorna: length, 6 primeiros, 4 últimos chars, e se contém caracteres de controle invisíveis.
app.get('/api/debug/r2', (c) => {
  const clean = (s: string) =>
    (s || '').replace(/^[\s\uFEFF\xA0\u200B\u200C\u200D\u2060]+|[\s\uFEFF\xA0\u200B\u200C\u200D\u2060]+$/g, '');
  const inspect = (name: string, rawVal: string, expectHostnameOnly = false) => {
    const val = clean(String(rawVal || ''));
    const len = val.length;
    const first6 = val.slice(0, 6);
    const last4 = val.slice(-4);
    // Detecta caracteres de controle / não imprimíveis / BOM / zero-width
    let ctrlChars: { ch: string; code: number; pos: number }[] = [];
    for (let i = 0; i < val.length; i++) {
      const code = val.charCodeAt(i);
      if (code < 32 || code === 127 || (code >= 0x200B && code <= 0x200F) || code === 0xFEFF || code === 0x202A || code === 0x202B || code === 0x202C || code === 0x202D || code === 0x202E) {
        ctrlChars.push({ ch: val[i], code, pos: i });
        if (ctrlChars.length >= 6) break;
      }
    }
    let badHostnameChars = 0;
    if (expectHostnameOnly) {
      for (let i = 0; i < val.length; i++) {
        const cc = val.charCodeAt(i);
        const ok = (cc >= 48 && cc <= 57) || (cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || cc === 45; // 0-9 A-Z a-z -
        if (!ok) badHostnameChars++;
      }
    }
    return {
      secret: name,
      len,
      preview_first6: first6,
      preview_last4: last4,
      control_chars_found: ctrlChars.length,
      control_chars: ctrlChars.map((c) => ({ pos: c.pos, code_dec: c.code, code_hex: 'U+' + c.code.toString(16).toUpperCase().padStart(4, '0') })),
      bad_hostname_chars: expectHostnameOnly ? badHostnameChars : null,
      endpoint_url_tried: expectHostnameOnly ? (len ? `https://${val}.r2.cloudflarestorage.com` : null) : null,
    };
  };
  const accountIdRaw = String((c.env as any).R2_ACCOUNT_ID || '');
  const accessKeyRaw = String((c.env as any).R2_ACCESS_KEY_ID || '');
  const secretKeyRaw = String((c.env as any).R2_SECRET_ACCESS_KEY || '');
  return c.json({
    ok: true,
    now: nowIso(),
    bucket: (c.env as any).PUBLIC_R2_URL_PREFIX || null,
    secrets: [
      inspect('R2_ACCOUNT_ID', accountIdRaw, true),
      inspect('R2_ACCESS_KEY_ID', accessKeyRaw),
      inspect('R2_SECRET_ACCESS_KEY', secretKeyRaw),
    ],
    check: {
      presigned_ready:
        clean(accountIdRaw).length === 32 &&
        clean(accessKeyRaw).length >= 8 &&
        clean(secretKeyRaw).length >= 20,
      expected_r2_account_len: 32,
      tip: 'Se control_chars_found > 0: reescreva secret via pipe arquivo PowerShell (Set-Content -NoNewline + Get-Content | npx wrangler secret put). Se SignatureDoesNotMatch ainda ocorrer: recrie o token R2 "sos-editor-videos-presigned" no painel, atribua permissão Leitura/gravação APENAS ao bucket sos-editor-videos, e use Access/Secret KEY dele.',
    },
  });
});

// ============== PUBLIC CONFIG ==================
app.get('/api/config', async (c) => {
  const plans = await getAllPlans(c.env);
  const monthly = plans.find(p => p.type === 'monthly' && p.active === 1);
  const downloads = await getAllDownloads(c.env);
  const settings = await c.env.SOS_EDITOR_DB
    .prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const cfg: any = {
    plans,
    downloads,
    settings: (settings.results || []).reduce<any>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {}),
  };
  if (monthly) {
    cfg.plan_monthly_price_brl = Number(monthly.price || 0);
  }
  return c.json(cfg);
});

// ============== PUBLIC PLANS ==================
app.get('/api/plans', async (c) => {
  const rows = await getAllPlans(c.env);
  return c.json({ status: 'success', data: rows, count: rows.length });
});

// ============== PUBLIC DOWNLOADS ==================
app.get('/api/downloads', async (c) => {
  const rows = await getAllDownloads(c.env);
  return c.json({ status: 'success', data: rows, count: rows.length });
});

// ============== PUBLIC TRACK DOWNLOAD (incrementa contador) ==================
const trackDownloadSchema = z.object({
  os: z.string().min(1).max(32),
});
app.post('/api/track/download', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch { body = {}; }
  const parsed = trackDownloadSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'campo `os` obrigatório (string)');
  const os = String(parsed.data.os).toLowerCase();
  const dl = await incrementDownloadCount(c.env, os);
  if (!dl) return jsonError(404, `plataforma ${os} não encontrada`);
  return c.json({ status: 'success', data: { os: dl.os, count: dl.count } });
});

// ============== PUBLIC VIDEO PLAYER ==================
app.get('/api/videos/:id', async (c) => {
  const id = String(c.req.param('id') || '').trim();
  if (!id) return jsonError(400, 'video_id obrigatório');
  const row = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT * FROM videos WHERE video_id = ? LIMIT 1'
  ).bind(id).first<any>();
  if (!row) return jsonError(404, 'Vídeo não encontrado');
  // Incrementa contagem de visualizações (fire and forget)
  c.executionCtx?.waitUntil?.(
    c.env.SOS_EDITOR_DB.prepare(
      'UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = ?'
    ).bind(Number(row.id)).run().catch(() => {}) as any
  );
  return c.json({
    status: 'success',
    data: {
      id: row.video_id,
      title: row.title,
      filename: row.filename,
      size_bytes: row.size_bytes,
      mime_type: row.mime_type,
      url: row.storage_url,
      created_at: row.created_at,
      status: row.status,
    },
  });
});

// ============== LICENSE ACTIVATE (POST /api/license/activate) ==================
const ActivateSchema = z.object({
  device_id: z.string().min(1).max(200),
  display_name: z.string().max(200).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
});
app.post('/api/license/activate', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const parsed = ActivateSchema.safeParse(body || {});
  if (!parsed.success) return jsonError(400, 'device_id obrigatório');
  const { device_id, display_name, email } = parsed.data;
  const { ip } = getCtx(c);
  let user = await getUserByDevice(c.env, device_id);
  let created = false;
  if (!user) {
    user = await createUserDevice(c.env, {
      device_id, email: email || null, display_name: display_name || null, ip_created: ip,
    });
    created = !!user;
  } else {
    // atualiza last_seen e opcionalmente email/display se vier preenchido e vazio
    const patch: any = {};
    if (email && !user.email) patch.email = email;
    if (display_name && !user.display_name) patch.display_name = display_name;
    if (Object.keys(patch).length) await updateUserStatus(c.env, Number(user.id), patch);
    await touchUserLastSeen(c.env, Number(user.id));
    user = await getUserById(c.env, Number(user.id));
  }
  if (!user) return jsonError(500, 'Falha ao criar/recuperar usuário');
  const grant = await getActiveGrantForUserId(c.env, Number(user.id));
  const status = buildUserStatus(user, grant);
  const plan = await getMonthlyPlan(c.env);
  return c.json({
    status: created ? 'created' : 'activated',
    code: created ? 201 : 200,
    user_id: Number(user.id),
    device_id: user.device_id,
    allowed: status.allowed,
    license: status,
    plan_monthly_price_brl: plan ? Number(plan.price) : 4.99,
    plan_monthly: plan,
    trial_started_at: user.trial_started_at,
    trial_ends_at: user.trial_ends_at,
    created_at: user.created_at,
  }, created ? 201 : 200);
});

// ============== LICENSE STATUS (GET /api/license/status) ==================
app.get('/api/license/status', async (c) => {
  const deviceId = String(c.req.query('device_id') || '').trim();
  if (!deviceId) {
    const plan = await getMonthlyPlan(c.env);
    return c.json({
      status: 'error',
      code: 400,
      error: 'device_id is required',
      allowed: false,
      plan_monthly_price_brl: plan ? Number(plan.price) : 4.99,
      plan_monthly: plan,
    }, 400);
  }
  let user = await getUserByDevice(c.env, deviceId);
  if (!user) {
    // unknown_device: Electron fallback auto-activate
    const plan = await getMonthlyPlan(c.env);
    return c.json({
      status: 'error',
      code: 404,
      error: 'unknown_device',
      allowed: false,
      plan_monthly_price_brl: plan ? Number(plan.price) : 4.99,
      plan_monthly: plan,
    }, 404);
  }
  await touchUserLastSeen(c.env, Number(user.id));
  const u = await getUserById(c.env, Number(user.id));
  if (!u) return jsonError(500, 'Usuário não encontrado após touch');
  const grant = await getActiveGrantForUserId(c.env, Number(u.id));
  const status = buildUserStatus(u, grant);
  const plan = await getMonthlyPlan(c.env);
  return c.json({
    status: 'ok',
    user_id: Number(u.id),
    device_id: u.device_id,
    allowed: status.allowed,
    license: status,
    plan_monthly_price_brl: plan ? Number(plan.price) : 4.99,
    plan_monthly: plan,
    trial_started_at: u.trial_started_at,
    trial_ends_at: u.trial_ends_at,
  });
});

// ============== ADMIN LOGIN ==================
const AdminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});
app.post('/api/admin/login', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const parsed = AdminLoginSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'username e password obrigatórios');
  const admin = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT * FROM admin WHERE username = ? LIMIT 1'
  ).bind(parsed.data.username).first<any>();
  if (!admin) return jsonError(401, 'Credenciais inválidas');
  const ok = await verifyPassword(parsed.data.password, String(admin.password || ''));
  if (!ok) return jsonError(401, 'Credenciais inválidas');
  const token = await signAdminToken(c.env, Number(admin.id), String(admin.username));
  return c.json({
    status: 'success',
    token,
    admin: {
      id: Number(admin.id),
      username: String(admin.username),
    },
  });
});

// ============== ADMIN PLANS (CRUD) ==================
// GET /api/admin/plans (lista ALL, inclusive inativos — para Admin editar)
app.get('/api/admin/plans', requireAdminAuth, async (c) => {
  const rows = await getAllPlans(c.env);
  return c.json({ status: 'success', plans: rows, data: rows, count: rows.length });
});
// PUT /api/admin/plans (compatibilidade Admin antigo — atualiza enviando { id, price, name, active })
app.put('/api/admin/plans', requireAdminAuth, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const id = parseInt(String(body?.id || '0'), 10);
  if (!id) return jsonError(400, 'Campo "id" (integer) é obrigatório');
  const old = await getPlanById(c.env, id);
  if (!old) return jsonError(404, 'Plano não encontrado');
  const patch: any = {};
  if (typeof body?.name === 'string') patch.name = String(body.name).slice(0, 100);
  if (typeof body?.price === 'number' || typeof body?.price === 'string') {
    const p = Number(body.price);
    if (Number.isFinite(p) && p >= 0 && p <= 999999) patch.price = p;
  }
  if (typeof body?.active === 'boolean') patch.active = body.active ? 1 : 0;
  if (typeof body?.active === 'number') patch.active = Number(body.active) === 0 ? 0 : 1;
  if (!Object.keys(patch).length) return jsonError(400, 'Nenhum campo para atualizar');
  const ok = await updatePlan(c.env, id, patch);
  if (!ok) return jsonError(500, 'Falha ao atualizar plano');
  const updated = await getPlanById(c.env, id);
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const action = id === 2 ? 'plan.update_price.monthly' : id === 3 ? 'plan.update_price.lifetime' : 'plan.update';
  await logAudit({
    env: c.env, admin_id: adminId, action, target_type: 'plan', target_id: id,
    old_value: old, new_value: updated, reason: body?.reason || null,
    ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', plan: updated, data: updated });
});
// (rota PUT /api/admin/plans/:id existente na L384 permanece)

// ============== ADMIN SETTINGS ==================
app.get('/api/admin/settings', requireAdminAuth, async (c) => {
  const rows = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT key, value FROM settings ORDER BY key ASC'
  ).all<{ key: string; value: string }>();
  const obj: Record<string, string> = {};
  for (const r of (rows.results || [])) obj[r.key] = r.value;
  return c.json({ status: 'success', settings: obj, data: obj });
});
app.put('/api/admin/settings', requireAdminAuth, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  if (!body || typeof body !== 'object') return jsonError(400, 'Payload inválido');
  const allowedKeys = new Set([
    'site_name','hero_title','hero_subtitle','hero_cta','primary_color',
    'contact_email','contact_phone','admin_contact_whatsapp','maintenance_mode',
    'privacy_policy_url','terms_of_service_url','copyright_text',
    'banner_top_text','social_instagram_url','social_twitter_url','social_facebook_url',
    'social_youtube_url','social_tiktok_url',
    'logo_url','payment_active','pix_key',
    'trial_days','free_trial_enabled','plan_monthly_default_price_brl','plan_lifetime_default_price_brl'
  ]);
  const updates: Array<[string, string]> = [];
  for (const [k, vRaw] of Object.entries(body)) {
    if (!allowedKeys.has(k)) continue;
    const value = (vRaw == null) ? '' : String(vRaw).slice(0, 10000);
    updates.push([k, value]);
  }
  if (!updates.length) return jsonError(400, 'Nenhuma configuração permitida para atualizar');
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  let applied = 0;
  const oldRes = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT key, value FROM settings WHERE key IN (SELECT value FROM json_each(?))'
  ).bind(JSON.stringify(updates.map(u => u[0]))).all<{ key: string; value: string }>();
  const oldMap: Record<string, string> = {};
  for (const r of oldRes.results || []) oldMap[r.key] = r.value;
  for (const [k, v] of updates) {
    const info = await c.env.SOS_EDITOR_DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    ).bind(k, v).run();
    if ((info.meta.changes || 0) > 0) applied++;
  }
  const newRes = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT key, value FROM settings WHERE key IN (SELECT value FROM json_each(?))'
  ).bind(JSON.stringify(updates.map(u => u[0]))).all<{ key: string; value: string }>();
  const newMap: Record<string, string> = {};
  for (const r of newRes.results || []) newMap[r.key] = r.value;
  await logAudit({
    env: c.env, admin_id: adminId, action: 'settings.update', target_type: 'settings', target_id: null,
    old_value: oldMap, new_value: newMap, reason: body.reason || null,
    ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', data: newMap, applied });
});

// ============== ADMIN COUPONS (CRUD) ==================
interface CouponRow { id: number; code: string; discount: number; active: number; }
app.get('/api/admin/coupons', requireAdminAuth, async (c) => {
  const rows = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT id, code, discount, active FROM coupons ORDER BY id DESC'
  ).all<CouponRow>();
  const data = rows.results || [];
  return c.json({ status: 'success', coupons: data, data });
});
app.post('/api/admin/coupons', requireAdminAuth, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const code = (body?.code || '').trim().toUpperCase();
  if (!code || code.length > 50) return jsonError(400, 'Campo "code" obrigatório (1-50 chars)');
  const discountRaw =
    (typeof body?.discount === 'number') ? Number(body.discount) :
    (typeof body?.discount_percent === 'number') ? Number(body.discount_percent) :
    NaN;
  if (!Number.isFinite(discountRaw) || discountRaw < 0 || discountRaw > 100) {
    return jsonError(400, 'Campo "discount" ou "discount_percent" obrigatório (0-100 %)');
  }
  const active = body?.active === false || body?.active === 0 ? 0 : 1;
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  try {
    const info = await c.env.SOS_EDITOR_DB.prepare(
      'INSERT INTO coupons (code, discount, active) VALUES (?, ?, ?)'
    ).bind(code, discountRaw, active).run();
    const id = Number(info.meta.last_row_id);
    if (!id) return jsonError(500, 'Falha ao criar cupom (código duplicado?)');
    const row: CouponRow = { id, code, discount: discountRaw, active };
    await logAudit({
      env: c.env, admin_id: adminId, action: 'coupon.create', target_type: 'coupon', target_id: id,
      old_value: null, new_value: row, reason: body.reason || null,
      ip_address: ip, user_agent: ua,
    });
    return c.json({ status: 'success', coupon: row, data: row });
  } catch (e: any) {
    return jsonError(409, 'Código de cupom duplicado. Escolha outro código.');
  }
});
app.delete('/api/admin/coupons/:id', requireAdminAuth, async (c) => {
  const id = parseInt(String(c.req.param('id') || '0'), 10);
  if (!id) return jsonError(400, 'id do cupom inválido');
  let body: any = null;
  try { body = await c.req.json().catch(() => null); } catch {}
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const old = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT id, code, discount, active FROM coupons WHERE id = ?'
  ).bind(id).first<CouponRow>();
  if (!old) return jsonError(404, 'Cupom não encontrado');
  const info = await c.env.SOS_EDITOR_DB.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
  if ((info.meta.changes || 0) <= 0) return jsonError(500, 'Falha ao excluir cupom');
  await logAudit({
    env: c.env, admin_id: adminId, action: 'coupon.delete', target_type: 'coupon', target_id: id,
    old_value: old, new_value: null, reason: (body && body.reason) || null,
    ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', removed_id: id, data: { removed_id: id } });
});

// ============== ADMIN STATS ==================
app.get('/api/admin/stats', requireAdminAuth, async (c) => {
  const totalUsers = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT COUNT(*) c FROM users'
  ).first<{ c: number }>();
  const trialActive = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT COUNT(*) c FROM users WHERE status != \'blocked\' AND trial_ends_at > ?'
  ).bind(nowIso()).first<{ c: number }>();
  const totalVideos = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT COUNT(*) c FROM videos'
  ).first<{ c: number }>();
  const totalSize = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT COALESCE(SUM(size_bytes),0) s FROM videos'
  ).first<{ s: number }>();
  const downloadsSum = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT SUM(count) c FROM downloads'
  ).first<{ c: number }>();
  const allDownloads = await getAllDownloads(c.env);
  return c.json({
    status: 'success',
    data: {
      total_users: Number(totalUsers?.c || 0),
      trial_active: Number(trialActive?.c || 0),
      total_videos: Number(totalVideos?.c || 0),
      total_videos_size_bytes: Number(totalSize?.s || 0),
      total_downloads: Number(downloadsSum?.c || 0),
      downloadsByOS: allDownloads.map(d => ({ os: d.os, count: d.count, active: d.active })),
    },
  });
});

// ============== ADMIN USERS ==================
app.get('/api/admin/users', requireAdminAuth, async (c) => {
  const q = String(c.req.query('q') || '').trim();
  const page = Math.max(1, parseInt(String(c.req.query('page') || '1'), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(c.req.query('limit') || '50'), 10) || 50));
  const { rows, total } = await listUsers(c.env, q, page, limit);
  // Enriquecer com status/licença
  const rows2 = await Promise.all(rows.map(async (u) => {
    const grant = await getActiveGrantForUserId(c.env, Number(u.id));
    const s = buildUserStatus(u, grant);
    return { ...u, license: s };
  }));
  return c.json({ status: 'success', rows: rows2, total, page, limit });
});

app.get('/api/admin/users/:id', requireAdminAuth, async (c) => {
  const id = parseInt(String(c.req.param('id')), 10);
  if (!id) return jsonError(400, 'user_id inválido');
  const user = await getUserById(c.env, id);
  if (!user) return jsonError(404, 'Usuário não encontrado');
  const grant = await getActiveGrantForUserId(c.env, id);
  const { rows: grants } = await listGrants(c.env, { user_id: id, limit: 50 });
  return c.json({ status: 'success', user, license: buildUserStatus(user, grant), grants });
});

const StatusPatchSchema = z.object({
  status: z.enum(['active', 'blocked']),
  reason: z.string().max(1000).optional().nullable(),
});
app.put('/api/admin/users/:id/status', requireAdminAuth, async (c) => {
  const id = parseInt(String(c.req.param('id')), 10);
  if (!id) return jsonError(400, 'user_id inválido');
  const old = await getUserById(c.env, id);
  if (!old) return jsonError(404, 'Usuário não encontrado');
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = StatusPatchSchema.safeParse(body);
  if (!p.success) return jsonError(400, 'status deve ser active ou blocked');
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const ok = await updateUserStatus(c.env, id, { status: p.data.status });
  if (!ok) return jsonError(500, 'Falha ao atualizar status');
  const updated = await getUserById(c.env, id);
  await logAudit({
    env: c.env, admin_id: adminId, action: 'user.status.update',
    target_type: 'user', target_id: id, old_value: old, new_value: updated,
    reason: p.data.reason || null, ip_address: ip, user_agent: ua,
  });
  const grant = await getActiveGrantForUserId(c.env, id);
  return c.json({ status: 'success', user: updated, license: buildUserStatus(updated, grant) });
});

// ============== ADMIN PLANS UPDATE PRICE (AUTORIDADE PREÇO) ==================
const PlanPatchSchema = z.object({
  name: z.string().max(100).optional(),
  price: z.number().min(0).max(999999).optional(),
  active: z.boolean().optional(),
  reason: z.string().max(1000).optional().nullable(),
});
app.put('/api/admin/plans/:id', requireAdminAuth, async (c) => {
  const id = parseInt(String(c.req.param('id')), 10);
  if (!id) return jsonError(400, 'plan_id inválido');
  const old = await getPlanById(c.env, id);
  if (!old) return jsonError(404, 'Plano não encontrado');
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = PlanPatchSchema.safeParse(body);
  if (!p.success) return jsonError(400, 'Payload inválido');
  const patch: any = {};
  if (typeof p.data.name === 'string') patch.name = p.data.name;
  if (typeof p.data.price === 'number') patch.price = p.data.price;
  if (typeof p.data.active === 'boolean') patch.active = p.data.active ? 1 : 0;
  if (!Object.keys(patch).length) return jsonError(400, 'Nenhum campo para atualizar');
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const ok = await updatePlan(c.env, id, patch);
  if (!ok) return jsonError(500, 'Falha ao atualizar plano');
  const updated = await getPlanById(c.env, id);
  const action = id === 2 ? 'plan.update_price.monthly' : 'plan.update';
  await logAudit({
    env: c.env, admin_id: adminId, action, target_type: 'plan', target_id: id,
    old_value: old, new_value: updated, reason: p.data.reason || null,
    ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', plan: updated });
});

// ============== ADMIN DOWNLOADS UPDATE ==================
const DownloadPatchSchema = z.object({
  os: z.string().min(1).max(32).optional(),
  version: z.string().max(32).nullable().optional(),
  url: z.string().max(512).nullable().optional(),
  count: z.number().int().min(0).max(999999999).optional(),
  active: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  reason: z.string().max(1000).nullable().optional(),
});
app.put('/api/admin/download', requireAdminAuth, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = DownloadPatchSchema.safeParse(body);
  if (!p.success || !body?.os) {
    return jsonError(400, 'Payload inválido. Campos permitidos: os, version, url, count, active.');
  }
  const os = String(body.os).toLowerCase();
  const old = await getDownloadByOs(c.env, os);
  if (!old) return jsonError(404, `Plataforma ${os} não encontrada`);
  const patch: any = {};
  if (typeof p.data.version !== 'undefined') patch.version = p.data.version;
  if (typeof p.data.url !== 'undefined') patch.url = p.data.url;
  if (typeof p.data.count === 'number') patch.count = p.data.count;
  if (typeof p.data.active !== 'undefined') {
    patch.active = p.data.active === true || p.data.active === 1 ? 1 : 0;
  }
  if (!Object.keys(patch).length) return jsonError(400, 'Nenhum campo para atualizar');
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const updated = await updateDownload(c.env, os, patch);
  if (!updated) return jsonError(500, 'Falha ao atualizar plataforma de download');
  await logAudit({
    env: c.env, admin_id: adminId, action: 'download.update',
    target_type: 'download', target_id: null, old_value: old, new_value: updated,
    reason: p.data.reason || null, ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', data: updated });
});

// ============== ADMIN ACCESS GRANTS ==================
app.get('/api/admin/access-grants', requireAdminAuth, async (c) => {
  const user_id = parseInt(String(c.req.query('user_id') || '0'), 10) || undefined;
  const activeStr = String(c.req.query('active') || '');
  const active: 0 | 1 | undefined = activeStr === '1' ? 1 : activeStr === '0' ? 0 : undefined;
  const page = Math.max(1, parseInt(String(c.req.query('page') || '1'), 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(String(c.req.query('limit') || '50'), 10) || 50));
  const res = await listGrants(c.env, { user_id, active, page, limit });
  return c.json({ status: 'success', grants: res.rows, rows: res.rows, total: res.total, page, limit });
});

const CreateGrantSchema = z.union([
  z.object({ user_id: z.number().min(1), days: z.number().int().min(1).max(3650), reason: z.string().max(1000).optional().nullable() }),
  z.object({ user_id: z.number().min(1), expires_at: z.string().refine(v => parseIsoDate(v) > Date.now(), { message: 'expires_at deve ser uma data futura ISO' }), reason: z.string().max(1000).optional().nullable() }),
]);
app.post('/api/admin/access-grants', requireAdminAuth, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = CreateGrantSchema.safeParse(body);
  if (!p.success) {
    const msgs = p.error.issues.map(i => i.message).join('; ');
    return jsonError(400, `Payload inválido: ${msgs}`);
  }
  const user = await getUserById(c.env, Number((p.data as any).user_id));
  if (!user) return jsonError(404, 'Usuário não encontrado');
  const expires_at: string = (p.data as any).expires_at || addDaysIso(Number((p.data as any).days));
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const res = await createGrant(c.env, {
    user_id: Number((p.data as any).user_id), admin_id: adminId, expires_at,
    reason: (p.data as any).reason || null,
  });
  if (!res) return jsonError(500, 'Falha ao criar grant');
  const grant = await getGrantById(c.env, Number(res.id));
  await logAudit({
    env: c.env, admin_id: adminId, action: 'grant.create',
    target_type: 'grant', target_id: Number(res.id), old_value: null, new_value: grant,
    reason: (p.data as any).reason || null, ip_address: ip, user_agent: ua,
  });
  const license = buildUserStatus(user, grant);
  return c.json({ status: 'success', grant, allowed: license.allowed, user_license: license }, 201);
});

const RevokeSchema = z.object({ reason: z.string().max(1000).optional().nullable() });
app.post('/api/admin/access-grants/:id/revoke', requireAdminAuth, async (c) => {
  const id = parseInt(String(c.req.param('id')), 10);
  if (!id) return jsonError(400, 'grant_id inválido');
  const old = await getGrantById(c.env, id);
  if (!old) return jsonError(404, 'Grant não encontrado');
  if (Number(old.active) !== 1) return jsonError(409, 'Grant já está inativo/revogado');
  let body: any = {};
  try { body = (await c.req.json()) || {}; } catch { body = {}; }
  const p = RevokeSchema.safeParse(body);
  const reason = p.success ? p.data.reason : null;
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const ok = await revokeGrant(c.env, id, adminId, reason || null);
  if (!ok) return jsonError(500, 'Falha ao revogar grant');
  const updated = await getGrantById(c.env, id);
  await logAudit({
    env: c.env, admin_id: adminId, action: 'grant.revoke',
    target_type: 'grant', target_id: id, old_value: old, new_value: updated,
    reason: reason || null, ip_address: ip, user_agent: ua,
  });
  return c.json({ status: 'success', grant: updated });
});

// ============== ADMIN AUDIT LOGS ==================
app.get('/api/admin/audit-logs', requireAdminAuth, async (c) => {
  const opts = {
    action: String(c.req.query('action') || '').trim() || undefined,
    target_type: String(c.req.query('target_type') || '').trim() || undefined,
    target_id: (parseInt(String(c.req.query('target_id') || '0'), 10) || undefined) as number | undefined,
    admin_id: (parseInt(String(c.req.query('admin_id') || '0'), 10) || undefined) as number | undefined,
    q: String(c.req.query('q') || '').trim() || undefined,
    page: Math.max(1, parseInt(String(c.req.query('page') || '1'), 10) || 1),
    limit: Math.min(500, Math.max(1, parseInt(String(c.req.query('limit') || '50'), 10) || 50)),
  };
  const res = await listAuditLogs(c.env, opts as any);
  return c.json({ status: 'success', logs: res.rows, rows: res.rows, total: res.total, page: opts.page, limit: opts.limit });
});

// ============== COUPONS REDEEM (Ligação App Desktop ↔ Cupons Admin) ==================
// POST /api/coupons/redeem — usuário App Desktop insere código cupom e ganha acesso.
// Cupom 100% → dá grant VITALÍCIO (3650 dias, ou seja, Plano Único).
// Cupom outros % → dá grant mensal estendido (30 dias) OU subscription ativa 30d.
const RedeemSchema = z.object({
  code: z.string().min(1).max(50),
  device_id: z.string().min(1).max(255).optional(),
  email: z.string().max(255).email().optional().nullable(),
});
app.post('/api/coupons/redeem', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = RedeemSchema.safeParse(body || {});
  if (!p.success) {
    const msgs = p.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return jsonError(400, `Payload inválido. Código do cupom e device_id são obrigatórios. Detalhes: ${msgs}`);
  }
  try {
    const code = (p.data.code || '').trim().toUpperCase();
    if (!code) return jsonError(400, 'Código do cupom inválido');

    const coupon = await c.env.SOS_EDITOR_DB.prepare(
      'SELECT id, code, discount, active FROM coupons WHERE code = ? LIMIT 1'
    ).bind(code).first<{ id: number; code: string; discount: number; active: number }>();
    if (!coupon) return jsonError(404, 'Cupom não encontrado');
    if (Number(coupon.active) !== 1) return jsonError(410, 'Cupom inativo ou expirado');

    let user: any = null;
    let createdNewUser = false;
    const { ip } = getCtx(c);
    if (p.data.device_id) {
      user = await getUserByDevice(c.env, String(p.data.device_id));
      if (!user) {
        user = await createUserDevice(c.env, {
          device_id: String(p.data.device_id),
          email: p.data.email || null,
          display_name: null,
          ip_created: ip,
        });
        if (user) createdNewUser = true;
      }
    } else if (p.data.email) {
      user = await getUserByEmail(c.env, p.data.email);
      if (!user) return jsonError(400, 'device_id obrigatório para resgatar cupom no app');
    }
    if (!user) return jsonError(500, 'Falha ao localizar/criar usuário');

    const discount = Number(coupon.discount) || 0;
    let grantDays = 30;
    let reason = `Cupom ${coupon.code} (${discount}%)`;
    let planIdToAssign: number | null = null;
    if (discount >= 100) {
      grantDays = 3650;
      reason = `Plano Único Vitalício cupom ${coupon.code}`;
      planIdToAssign = 3;
    } else if (discount >= 50) {
      grantDays = 90;
    }

    const expires_at = addDaysIso(grantDays);
    const fallbackAdminId = 1;
    const grant = await createGrant(c.env, {
      user_id: Number(user.id),
      admin_id: fallbackAdminId,
      expires_at,
      reason,
    });
    if (!grant) return jsonError(500, 'Falha ao atribuir cupom (grant)');

    const userPatch: any = {
      subscription_status: discount >= 100 ? 'lifetime' : 'active',
      subscription_expires_at: expires_at,
    };
    if (planIdToAssign) userPatch.plan_id = planIdToAssign;
    if (p.data.email && !user.email) userPatch.email = p.data.email;
    await updateUserStatus(c.env, Number(user.id), userPatch);

    const refreshedUser = await getUserById(c.env, Number(user.id));
    const activeGrant = await getActiveGrantForUserId(c.env, Number(user.id));
    const status = buildUserStatus(refreshedUser, activeGrant);
    const plan = planIdToAssign ? (await getPlanById(c.env, planIdToAssign)) : (await getMonthlyPlan(c.env));
    return c.json({
      status: 'success',
      coupon: { id: coupon.id, code: coupon.code, discount },
      user_id: Number(user.id),
      created_new_user: createdNewUser,
      granted_days: grantDays,
      grant_expires_at: expires_at,
      allowed: !!status?.allowed,
      license: status || null,
      plan: plan || null,
      plan_id: planIdToAssign || null,
      plan_price_brl: plan ? Number(plan.price) : 0,
    }, 201);
  } catch (e: any) {
    console.error('[REDEEM ERROR]', e);
    return jsonError(500, `Erro ao resgatar cupom: ${String(e?.message || e)}`);
  }
});

// ============== ADMIN: Ativar Subscription Manual (além de Access Grants) ==================
// Facilita Admin marcar pagamento PIX recebido e ativar plano no usuário (vitalício ou mensal).
const ActivateSubSchema = z.object({
  user_id: z.number().int().min(1),
  plan_id: z.number().int().min(1).max(3).optional(),
  days: z.number().int().min(1).max(3650).optional(),
  provider: z.string().max(32).optional(),
  ref: z.string().max(255).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
});
app.post('/api/admin/users/:id/activate-subscription', requireAdminAuth, async (c) => {
  const userId = parseInt(String(c.req.param('id')), 10);
  if (!userId) return jsonError(400, 'user_id inválido');
  let body: any;
  try { body = await c.req.json(); } catch { return jsonError(400, 'Body JSON inválido'); }
  const p = ActivateSubSchema.safeParse({ user_id: userId, ...(body || {}) });
  if (!p.success) {
    const msgs = p.error.issues.map(i => i.message).join('; ');
    return jsonError(400, `Payload inválido: ${msgs}`);
  }
  const user = await getUserById(c.env, userId);
  if (!user) return jsonError(404, 'Usuário não encontrado');
  const planId = p.data.plan_id || 2;
  const days = p.data.days || (planId === 3 ? 3650 : 30);
  const plan = await getPlanById(c.env, planId);
  if (!plan) return jsonError(400, 'plano não encontrado (use 1=Free, 2=Mensal, 3=Vitalício)');

  const expires_at = addDaysIso(days);
  const subStatus = planId === 3 ? 'lifetime' : 'active';
  await updateUserStatus(c.env, userId, {
    plan_id: planId,
    subscription_status: subStatus,
    subscription_expires_at: expires_at,
    payment_provider: p.data.provider || (planId === 3 ? 'manual_lifetime' : 'manual'),
    payment_ref: p.data.ref || null,
  });

  // Cria grant correspondente (garante buildUserStatus → allowed=true)
  const { adminId } = getAdminCtx(c);
  const { ip, ua } = getCtx(c);
  const grant = await createGrant(c.env, {
    user_id: userId, admin_id: adminId, expires_at,
    reason: p.data.reason || `Ativação manual plano ${plan.name} (${days} dias)`,
  });

  const refreshed = await getUserById(c.env, userId);
  const g = grant ? await getActiveGrantForUserId(c.env, userId) : null;
  await logAudit({
    env: c.env, admin_id: adminId, action: 'user.activate_subscription',
    target_type: 'user', target_id: userId,
    old_value: user, new_value: refreshed,
    reason: p.data.reason || null, ip_address: ip, user_agent: ua,
  });
  return c.json({
    status: 'success',
    user: refreshed,
    license: buildUserStatus(refreshed, g),
    plan,
    subscription_expires_at: expires_at,
  }, 201);
});

// ============== HELPERS R2 PRESIGNED URL ==============
// Cloudflare Workers tem LIMITE INTRANSPONÍVEL de ~100MB por corpo de requisição HTTP.
// Para vídeos > 80MB, geramos Presigned PUT URL S3v4 no Worker, Electron envia o arquivo
// DIRETO para o endpoint S3-compatível público do R2 (não passa pelo Worker, sem limite).
const R2_S3_ENDPOINT = (accountId: string) => `https://${accountId}.r2.cloudflarestorage.com`;
const R2_MAX_PRESIGNED_EXPIRES_SECONDS = 60 * 60 * 6; // 6 horas (vídeos grandes demoram)
function getBucketName(env: Env): string {
  // Obtém nome do bucket: preferimos binding wrangler.toml (não exposto em runtime infelizmente)
  // então usamos fallback via SECRET opcional ou padrão.
  return String((env as any).R2_BUCKET_NAME || 'sos-editor-videos');
}
function buildS3ClientForR2(env: Env): S3Client | null {
  const accountIdRaw = (env.R2_ACCOUNT_ID || '').toString();
  const accessKeyIdRaw = (env.R2_ACCESS_KEY_ID || '').toString();
  const secretAccessKeyRaw = (env.R2_SECRET_ACCESS_KEY || '').toString();
  // Removemos WHITESPACE e BOM/ZeroWidthSpace, que costumam colar acidentalmente
  const clean = (s: string) =>
    s.replace(/^[\s\uFEFF\xA0\u200B\u200C\u200D\u2060]+|[\s\uFEFF\xA0\u200B\u200C\u200D\u2060]+$/g, '');
  const accountId = clean(accountIdRaw);
  const accessKeyId = clean(accessKeyIdRaw);
  const secretAccessKey = clean(secretAccessKeyRaw);
  const preview = (s: string) => {
    if (!s) return '(vazio)';
    const left = s.slice(0, 6);
    const right = s.slice(-4);
    return `${left}...${right} (len=${s.length})`;
  };
  if (!accountId || !accessKeyId || !secretAccessKey) {
    (buildS3ClientForR2 as any)._lastError =
      'Ao menos 1 secret R2 está vazia. Valores limpos: ' +
      `accountId=${preview(accountId)}, accessKeyId=${preview(accessKeyId)}, secretAccessKey=${preview(secretAccessKey)}`;
    return null;
  }
  // Valida caracteres de HOSTNAME (R2_ACCOUNT_ID = hex/account-id, só [a-z0-9-] sem pontos/barras)
  const invalidHostnameChars = [...accountId].filter(c => !/[a-z0-9-]/i.test(c)).join('');
  if (invalidHostnameChars) {
    const codepoints = [...invalidHostnameChars].slice(0, 6).map(c => c.charCodeAt(0).toString(16)).join(' U+');
    (buildS3ClientForR2 as any)._lastError =
      'R2_ACCOUNT_ID possui caracteres INVALIDOS para hostname: "' +
      invalidHostnameChars.slice(0, 20) +
      `" (U+${codepoints}). Esperado 32 chars hex (só a-z0-9). Valor limpo = ${preview(accountId)}. ` +
      'Reescreva a secret via pipe Set-Content PowerShell (sem usar o prompt interativo Enter a secret value).';
    return null;
  }
  try {
    const endpoint = R2_S3_ENDPOINT(accountId);
    const _u = new URL(endpoint);
    return new S3Client({
      region: 'auto',
      endpoint: _u.toString(),
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  } catch (e: any) {
    const msg =
      'Falha ao construir cliente S3 R2. ' +
      `R2_ACCOUNT_ID (limpo) = ${preview(accountId)}. ` +
      `Endpoint tentado = "${R2_S3_ENDPOINT(accountId)}". ` +
      `Causa: ${e?.message || e}. ` +
      'Verifique no Painel Cloudflare → R2 → Manage R2 API Tokens o campo "Account ID" (32 chars hex no topo).';
    console.error('[S3Client ERROR]', msg);
    (buildS3ClientForR2 as any)._lastError = msg;
    return null;
  }
}
function lastS3ClientError(): string | null {
  return (buildS3ClientForR2 as any)._lastError || null;
}
function buildStorageUrlForR2Key(env: Env, r2Key: string): string {
  const publicPrefix = (env.PUBLIC_R2_URL_PREFIX || '').replace(/\/+$/, '');
  if (publicPrefix) return `${publicPrefix}/${r2Key}`;
  return `r2://${r2Key}`;
}

const InitUploadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(200),
  size_bytes: z.number().int().min(1).max(4 * 1024 * 1024 * 1024),
  mime_type: z.string().max(128).optional(),
  device_id: z.string().max(200).optional().nullable(),
});
// ============== VIDEO INIT UPLOAD (presigned PUT URL) ==================
// Para vídeos GRANDES. Retorna URL pré-assinada + video_id + r2_key.
// Electron faz PUT DIRETO para presigned_url (com body=arquivo), depois chama /confirm-upload.
app.post('/api/videos/init-upload', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch (e: any) {
    return jsonError(400, 'Body JSON inválido: ' + String(e?.message || e));
  }
  const p = InitUploadSchema.safeParse(body);
  if (!p.success) {
    const firstErr = (p.error?.errors?.[0])?.message || 'payload inválido';
    return jsonError(400, 'Payload inválido: ' + firstErr);
  }

  const s3 = buildS3ClientForR2(c.env);
  if (!s3) {
    const clientErr = lastS3ClientError();
    const hint = clientErr
      ? clientErr
      : 'falta wrangler secret R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY. Configure esses 3 secrets ' +
        'ou reduza o tamanho do vídeo para <= 80MB (upload FormData normal).';
    return jsonError(501,
      'Presigned uploads desabilitados no backend: ' + hint);
  }

  const { filename, size_bytes, mime_type } = p.data;
  const title = (p.data.title || '').trim() || 'Vídeo sem título';
  const uploaderDeviceId = p.data.device_id ? String(p.data.device_id).slice(0, 200) : null;

  const { nanoid } = await import('nanoid');
  const videoId = nanoid(12);
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const ext = (filename || '').split('.').pop()?.toLowerCase() || 'mp4';
  const sanitizedName = (filename || `video-${videoId}.${ext}`)
    .replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const r2Key = `videos/${yyyy}/${mm}/${dd}/${videoId}_${sanitizedName}`;

  const bucketName = getBucketName(c.env);
  const mime = (mime_type || '').toLowerCase() || 'video/mp4';
  try {
    // CORREÇÃO 2026-08-26: Presigned URL assina SOMENTE Bucket + Key + ContentType.
    // NÃO coloque ContentDisposition / ContentLength / CacheControl / Metadata —
    // esses campos entram em X-Amz-SignedHeaders e o cliente precisa reproduzir
    // EXATAMENTE os valores, causando SignatureDoesNotMatch em clients diversos.
    // Esses atributos são recebidos pelo confirm-upload via body e gravados no D1.
    const cmd = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: mime,
    });
    const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: R2_MAX_PRESIGNED_EXPIRES_SECONDS });
    if (!presignedUrl || typeof presignedUrl !== 'string' || !/^https?:\/\//i.test(presignedUrl)) {
      throw new Error(`URL assinada inválida retornada por getSignedUrl (bucket=${bucketName}, key=${r2Key.length} chars)`);
    }
    // Extrai X-Amz-SignedHeaders para facilitar debug cliente
    let signedHeaders = 'host;content-type';
    try {
      const pu = new URL(presignedUrl);
      const sh = pu.searchParams.get('X-Amz-SignedHeaders');
      if (sh) signedHeaders = sh;
    } catch {}
    return c.json({
      status: 'success',
      upload_type: 'presigned_put',
      video_id: videoId,
      r2_key: r2Key,
      presigned_url: presignedUrl,
      expires_in_seconds: R2_MAX_PRESIGNED_EXPIRES_SECONDS,
      x_amz_signed_headers: signedHeaders,
      required_put_headers: {
        'Content-Type': mime,
      },
      pending_upload: {
        title,
        filename: sanitizedName,
        original_filename: sanitizedName,
        size_bytes: Number(size_bytes),
        mime_type: mime,
        uploader_device_id: uploaderDeviceId || '',
      },
      data: {
        id: videoId,
        upload_type: 'presigned_put',
        presigned_url: presignedUrl,
      },
    });
  } catch (e: any) {
    const root = String(e?.message || e || '');
    const details = root.includes('Invalid URL') || root.toLowerCase().includes('url')
      ? (
          'Causas prováveis deste erro: (1) Secret R2_ACCOUNT_ID colada com espaço no início/fim, ou valor errado ' +
          '(Account ID correto fica em Painel Cloudflare → R2 → Manage R2 API Tokens, 32 chars hex). ' +
          '(2) Secret R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY inválidos/expirados — crie novo token. ' +
          '(3) Nome do bucket R2 incorreto (atual = "' + bucketName + '"), confira em R2 → Buckets. ' +
          'Mensagem original: ' + root
        )
      : root;
    console.error('[PRESIGNED URL FAIL]', { error: root, bucketName, r2KeyLen: r2Key.length });
    return jsonError(502, 'Falha ao gerar URL de upload: ' + details);
  }
});

// ============== VIDEO CONFIRM UPLOAD (registra no D1 após PUT no R2) ==================
// Após Electron terminar PUT direto no R2 via presigned URL, ele chama essa rota com o
// video_id para confirmar a existência no bucket e persistir os dados na tabela videos.
// IMPORTANTE: Como a presigned URL NÃO assina Metadata (para evitar SignatureDoesNotMatch),
// recebemos title/original_filename/size_bytes/mime_type/uploader_device_id COMO CAMPOS DE BODY.
const ConfirmUploadSchema = z.object({
  video_id: z.string().min(8).max(64),
  r2_key: z.string().min(3).max(512).optional(),
  title: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(200).optional(),
  original_filename: z.string().min(1).max(200).optional(),
  size_bytes: z.number().int().min(1).max(4 * 1024 * 1024 * 1024).optional(),
  mime_type: z.string().max(128).optional(),
  uploader_device_id: z.string().max(200).optional().nullable(),
});
app.post('/api/videos/confirm-upload', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch (e: any) {
    return jsonError(400, 'Body JSON inválido: ' + String(e?.message || e));
  }
  const p = ConfirmUploadSchema.safeParse(body);
  if (!p.success) return jsonError(400, 'Campos obrigatórios: video_id');
  const videoId = String(p.data.video_id);
  const r2KeyHint = p.data.r2_key ? String(p.data.r2_key) : null;

  const bucket = c.env.SOS_EDITOR_R2;
  if (!bucket) return jsonError(503, '[R2] Bucket não configurado no binding Worker');

  // 1) Descobrir r2_key do vídeo
  let r2Key = r2KeyHint;
  let head: R2Object | null = null;
  if (r2Key) {
    try { head = await bucket.head(r2Key); } catch { head = null; }
  }
  if (!head) {
    try {
      const listed = await bucket.list({ limit: 1000 });
      const hit = listed.objects.find(o => o.key.includes(videoId));
      if (hit) { r2Key = hit.key; head = hit; }
    } catch {}
  }
  if (!head || !r2Key) {
    return jsonError(404,
      `Arquivo para video_id=${videoId} não encontrado no bucket R2. ` +
      `Rode o PUT para a presigned_url antes de chamar /confirm-upload.`);
  }

  // 2) Montar resto do registro — prioriza body (recebido de init-upload), depois R2 metadata/head
  const { ip } = getCtx(c);
  const uploaderDeviceId = p.data.uploader_device_id
    ? String(p.data.uploader_device_id).slice(0, 200)
    : String(head.customMetadata?.uploader_device_id || '').slice(0, 200);
  const originalFilename =
    (p.data.original_filename && String(p.data.original_filename).slice(0, 200)) ||
    (p.data.filename && String(p.data.filename).slice(0, 200)) ||
    String(head.customMetadata?.original_filename || '').slice(0, 200) ||
    r2Key.split('/').pop() ||
    `video-${videoId}`;
  const title =
    (p.data.title && String(p.data.title).trim().slice(0, 200)) ||
    originalFilename;
  const filename = originalFilename;
  const mime =
    (p.data.mime_type && String(p.data.mime_type).toLowerCase()) ||
    String(head.httpMetadata?.contentType || '').toLowerCase() ||
    'video/mp4';
  const sizeBytes =
    (p.data.size_bytes && Number(p.data.size_bytes) > 0 ? Number(p.data.size_bytes) : 0) ||
    Number(head.size || 0);
  const storageUrl = buildStorageUrlForR2Key(c.env, r2Key);
  const createdAt = nowIso();

  // 3) INSERT D1 videos
  const info = await c.env.SOS_EDITOR_DB.prepare(
    `INSERT INTO videos
      (video_id, title, filename, size_bytes, mime_type, storage_url, r2_key, status, created_at, uploader_ip, uploader_device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?)`
  ).bind(
    videoId, title, filename, sizeBytes, mime, storageUrl, r2Key, createdAt, ip,
    uploaderDeviceId ? uploaderDeviceId : null
  ).run();
  const videoDbId = info.meta.last_row_id;
  if (!videoDbId) return jsonError(500, 'Falha ao registrar vídeo confirmado no banco D1');

  return c.json({
    status: 'success',
    id: videoId,
    video_id: videoId,
    title,
    url: storageUrl,
    storage_url: storageUrl,
    public_url: storageUrl,
    size_bytes: sizeBytes,
    mime_type: mime,
    filename,
    created_at: createdAt,
    db_id: Number(videoDbId),
    data: { id: videoId, url: storageUrl, title, storage_url: storageUrl, created_at: createdAt },
  }, 201);
});

// ============== VIDEO UPLOAD (POST /api/videos/upload) — Cloudflare R2 NATIVO ==================
// Multipart parser streaming do Hono/FormData nativo Worker.
// USO SOMENTE PARA VÍDEOS <= 80MB (senão dá 413 no Cloudflare).
// Para vídeos maiores, use o flow /api/videos/init-upload → PUT direto → /api/videos/confirm-upload.
app.post('/api/videos/upload', async (c) => {
  const bucket = c.env.SOS_EDITOR_R2;
  if (!bucket) return jsonError(503, '[R2] Bucket R2 não configurado no Worker binding SOS_EDITOR_R2');

  let formData: FormData;
  try { formData = await c.req.formData(); } catch (e: any) {
    return jsonError(400, 'FormData inválido: ' + String(e?.message || e));
  }
  const title = String(formData.get('title') || '').slice(0, 200) || 'Vídeo sem título';
  const uploaderDeviceId = String(formData.get('device_id') || '').slice(0, 200) || null;
  // Compatibilidade máxima: aceita campo "file" (padrão novo) OU "video" (Electron desktop legado)
  const fileField = formData.get('file') || formData.get('video');
  if (!fileField || typeof (fileField as any)?.arrayBuffer !== 'function') {
    return jsonError(400, 'Campo "file" ou "video" obrigatório (multipart/form-data, 1 arquivo MP4)');
  }
  const file = fileField as unknown as File;
  if (file.size <= 0) return jsonError(400, 'Arquivo vazio');
  const MAX_BYTES = 4 * 1024 * 1024 * 1024;
  if (file.size > MAX_BYTES) return jsonError(413, 'Arquivo excede limite de 4GB');
  // Aviso prévio: Cloudflare Workers limita corpo da requisição em ~100MB.
  // Rejeitamos explicitamente vídeos > 80MB aqui e apontamos para flow presigned.
  const FORM_DATA_LIMIT_WARN_BYTES = 80 * 1024 * 1024;
  if (file.size > FORM_DATA_LIMIT_WARN_BYTES) {
    return jsonError(413,
      `Arquivo muito grande (${Math.round(file.size / 1024 / 1024)}MB) para upload via FormData Workers. ` +
      `Limite = ${Math.round(FORM_DATA_LIMIT_WARN_BYTES / 1024 / 1024)}MB. Reduza o tamanho, ou ` +
      `use o flow Presigned URL do Electron (POST /api/videos/init-upload → PUT direto → POST /api/videos/confirm-upload).`);
  }
  const mime = (file.type || '').toLowerCase() || 'application/octet-stream';
  if (!isValidMimeVideo(mime) && !/\.mp4$|\.mov$|\.mkv$|\.avi$|\.webm$/i.test(file.name || '')) {
    // não bloqueia se Electron enviar mime genérico mas extensão ok
  }
  const { ip } = getCtx(c);
  const { nanoid } = await import('nanoid');
  const videoId = nanoid(12);
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || 'mp4';
  const sanitizedName = (file.name || `video-${videoId}.${ext}`)
    .replace(/[^\w.\-]+/g, '_').slice(0, 120);
  const r2Key = `videos/${yyyy}/${mm}/${dd}/${videoId}_${sanitizedName}`;

  // ---- Upload real para R2 via binding nativo ----
  let stored: R2Object | null = null;
  try {
    const buf = await file.arrayBuffer();
    stored = await bucket.put(r2Key, buf as any, {
      httpMetadata: {
        contentType: mime,
        contentDisposition: `inline; filename="${encodeURIComponent(sanitizedName)}"`,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        video_id: videoId,
        original_filename: sanitizedName,
        uploader_ip: ip,
        uploader_device_id: uploaderDeviceId || '',
      },
    });
  } catch (e: any) {
    console.error('[R2 PUT FAIL]', e);
    return jsonError(502, 'Falha ao armazenar no R2: ' + String(e?.message || e));
  }
  if (!stored) return jsonError(502, 'R2 retornou resposta vazia');

  // Monta URL pública
  const publicPrefix = (c.env.PUBLIC_R2_URL_PREFIX || '').replace(/\/+$/, '');
  let storageUrl = '';
  if (publicPrefix) storageUrl = `${publicPrefix}/${r2Key}`;
  else storageUrl = `r2://${r2Key}`;

  const createdAt = nowIso();
  const info = await c.env.SOS_EDITOR_DB.prepare(
    `INSERT INTO videos
      (video_id, title, filename, size_bytes, mime_type, storage_url, r2_key, status, created_at, uploader_ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded', ?, ?)`
  ).bind(
    videoId, title, sanitizedName, Number(file.size), mime, storageUrl, r2Key, createdAt, ip
  ).run();
  const videoDbId = info.meta.last_row_id;
  if (!videoDbId) return jsonError(500, 'Falha ao registrar vídeo no D1');

  return c.json({
    status: 'success',
    id: videoId,
    video_id: videoId,
    title,
    url: storageUrl,
    storage_url: storageUrl,
    public_url: storageUrl,
    size_bytes: Number(file.size),
    mime_type: mime,
    filename: sanitizedName,
    created_at: createdAt,
    db_id: Number(videoDbId),
    // Backward compat: Electron publish-video handler espera "data.id" e "data.url"
    data: { id: videoId, url: storageUrl, title, storage_url: storageUrl, created_at: createdAt },
  }, 201);
});

// ============== HELPERS STREAM R2 COM RANGE ==============
const buildR2ResponseFromObject = async (
  obj: R2ObjectBody | R2Object,
  range: R2Range | undefined,
  c: any,
): Promise<Response> => {
  const contentType = obj.httpMetadata?.contentType ||
    (obj.key.toLowerCase().endsWith('.mp4') ? 'video/mp4' :
     obj.key.toLowerCase().endsWith('.webm') ? 'video/webm' :
     obj.key.toLowerCase().endsWith('.mov') ? 'video/quicktime' :
     obj.key.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' :
     obj.key.toLowerCase().endsWith('.avi') ? 'video/x-msvideo' :
     'application/octet-stream');

  const contentDisposition = obj.httpMetadata?.contentDisposition ||
    `inline; filename="${encodeURIComponent(obj.key.split('/').pop() || 'video')}"`;

  const cacheControl = obj.httpMetadata?.cacheControl ||
    'public, max-age=31536000, immutable';

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Disposition', contentDisposition);
  headers.set('Cache-Control', cacheControl);
  headers.set('ETag', '"' + obj.httpEtag + '"');
  headers.set('Last-Modified', obj.uploaded.toUTCString());
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, ETag, Last-Modified');

  const bodyStream = (obj as R2ObjectBody).body;

  // Sem range: 200 com o objeto inteiro
  if (!range) {
    headers.set('Content-Length', String(obj.size));
    return new Response(bodyStream, { status: 200, headers });
  }
  // Com range: 206 Partial Content
  // O R2Range retornado tem offset e length ou suffix
  // Mas o obj retornado por get(range) é um body correspondente; usamos size relativo
  let length = obj.size;
  let start = ('offset' in (range as any)) ? Number((range as any).offset ?? 0) : 0;
  let end: number | undefined;
  if (range && 'offset' in (range as any) && (range as any).offset !== undefined) {
    start = Number((range as any).offset);
    if (typeof (range as any).length !== undefined && typeof (range as any).length === 'number') {
      end = start + Number((range as any).length) - 1;
    } else {
      end = obj.size + start - 1;
    }
  } else if (range && 'suffix' in (range as any)) {
    const suf = Number((range as any).suffix) || 0;
    start = Math.max(0, obj.size - suf);
    length = Math.min(obj.size, suf);
    end = obj.size - 1;
  }
  // Ajusta pela duração real do body (se menor que calculado)
  const realLen = (obj as any).size || length;
  end = Math.min(end as number, start + realLen - 1, obj.size - 1);
  const finalLen = Math.max(0, end - start + 1);

  headers.set('Content-Length', String(finalLen));
  headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
  return new Response(bodyStream, { status: 206, headers });
};

const parseRangeHeader = (rangeHeader: string | null, totalSize: number): R2Range | null => {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const r = rangeHeader.slice(6).split(',')[0].trim();
  if (!r) return null;
  try {
    if (r.startsWith('-')) {
      const suffix = parseInt(r.slice(1), 10);
      if (Number.isFinite(suffix) && suffix > 0) return { suffix: Math.min(suffix, totalSize) };
      return null;
    }
    const [startStr, endStr] = r.split('-');
    const start = parseInt(startStr, 10);
    if (!Number.isFinite(start)) return null;
    if (endStr === '' || endStr == null) {
      return { offset: start };
    }
    const end = parseInt(endStr, 10);
    if (!Number.isFinite(end) || end < start) return null;
    const length = Math.min(end - start + 1, totalSize - start);
    if (length <= 0) return null;
    return { offset: start, length };
  } catch {
    return null;
  }
};

// ============== STREAM DIRETO POR CHAVE R2 (fallback, não autenticado) ==============
app.get('/r2/*', async (c) => {
  const bucket = c.env.SOS_EDITOR_R2;
  if (!bucket) return jsonError(503, '[R2] Bucket não configurado');
  const key = (c.req.param('*') || '').replace(/^\/+/, '');
  if (!key) return jsonError(400, 'R2 key vazia');
  const rangeHeader = c.req.header('Range') || null;
  try {
    // Primeiro head para saber o size total e dar parse correto no range
    const head = await bucket.head(key);
    if (!head) return jsonError(404, 'Arquivo R2 não encontrado');
    const range = parseRangeHeader(rangeHeader, head.size) ?? undefined;
    const obj = range
      ? await bucket.get(key, { range, onlyIf: c.req.raw.headers as any })
      : await bucket.get(key, { onlyIf: c.req.raw.headers as any });
    if (!obj) return jsonError(404, 'Arquivo R2 não encontrado');
    return buildR2ResponseFromObject(obj, range, c);
  } catch (e: any) {
    console.error('[R2 STREAM FAIL]', key, e);
    return jsonError(502, 'Falha R2 stream: ' + String(e?.message || e));
  }
});

// ============== STREAM POR VIDEO_ID (GET /api/videos/:id/stream) — usado pelo player público ==============
app.get('/api/videos/:id/stream', async (c) => {
  const id = String(c.req.param('id') || '').trim();
  if (!id) return jsonError(400, 'video_id obrigatório');
  const bucket = c.env.SOS_EDITOR_R2;
  if (!bucket) return jsonError(503, '[R2] Bucket não configurado');
  const row = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT * FROM videos WHERE video_id = ? LIMIT 1'
  ).bind(id).first<any>();
  if (!row || !row.r2_key) return jsonError(404, 'Vídeo não encontrado');
  const rangeHeader = c.req.header('Range') || null;
  try {
    const head = await bucket.head(String(row.r2_key));
    if (!head) {
      // fallback: se PUBLIC_R2_URL_PREFIX existe, redireciona 302 temporário para o storage_url
      if (String(row.storage_url || '').startsWith('http')) {
        return c.redirect(String(row.storage_url), 302);
      }
      return jsonError(404, 'Arquivo de vídeo não está mais no storage R2');
    }
    const range = parseRangeHeader(rangeHeader, head.size) ?? undefined;
    const obj = range
      ? await bucket.get(String(row.r2_key), { range })
      : await bucket.get(String(row.r2_key));
    if (!obj) {
      if (String(row.storage_url || '').startsWith('http')) return c.redirect(String(row.storage_url), 302);
      return jsonError(404, 'Vídeo não encontrado no R2');
    }
    // Incrementa view (waitUntil, fire and forget)
    try { c.executionCtx?.waitUntil?.(
      c.env.SOS_EDITOR_DB.prepare('UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = ?')
        .bind(Number(row.id)).run()
    ); } catch {}
    return buildR2ResponseFromObject(obj, range, c);
  } catch (e: any) {
    console.error('[STREAM FAIL]', id, e);
    // fallback: redirect para storage_url se disponível
    if (String(row?.storage_url || '').startsWith('http')) {
      return c.redirect(String(row.storage_url), 302);
    }
    return jsonError(502, 'Falha ao transmitir vídeo: ' + String(e?.message || e));
  }
});

// Também: expor /api/videos/:id com campo stream_url para o player usar
app.get('/api/videos/:id', async (c) => {
  const id = String(c.req.param('id') || '').trim();
  if (!id) return jsonError(400, 'video_id obrigatório');
  const row = await c.env.SOS_EDITOR_DB.prepare(
    'SELECT * FROM videos WHERE video_id = ? LIMIT 1'
  ).bind(id).first<any>();
  if (!row) return jsonError(404, 'Vídeo não encontrado');
  const views = Number(row?.views || 0) + 1;
  try { c.executionCtx?.waitUntil?.(
    c.env.SOS_EDITOR_DB.prepare('UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = ?')
      .bind(Number(row.id)).run()
  ); } catch {}
  const streamRelative = `/api/videos/${encodeURIComponent(id)}/stream`;
  // Monta stream_url absoluta
  const url = new URL(c.req.url);
  const streamUrl = `${url.origin}${streamRelative}`;
  return c.json({
    status: 'success',
    data: {
      id: row.video_id,
      title: row.title,
      filename: row.filename,
      size_bytes: row.size_bytes,
      mime_type: row.mime_type,
      url: row.storage_url,
      storage_url: row.storage_url,
      stream_url: streamUrl,
      stream_relative: streamRelative,
      created_at: row.created_at,
      status: row.status,
      views,
    },
  });
});

// ============== 404 genérico ==================
app.notFound((c) => jsonError(404, 'Route not found'));

// ============== Error handler ==================
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return jsonError(err.status, err.message || 'HTTP Error');
  }
  console.error('[WORKER ERROR]', err);
  return jsonError(500, 'Internal Server Error: ' + String(err?.message || err));
});

export default app;
