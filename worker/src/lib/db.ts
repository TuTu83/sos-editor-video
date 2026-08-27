import type { Env, GrantRow, PlanRow, UserRow, DownloadRow } from '../types';
import { addDaysIso, nowIso, parseIsoDate, safeJson, truncateText } from './util';

// =============== Plans ==================
export const getAllPlans = async (env: Env): Promise<PlanRow[]> => {
  const res = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM plans ORDER BY id ASC')
    .all<PlanRow>();
  return res.results || [];
};

// =============== Settings ==================
export const getSetting = async (env: Env, key: string): Promise<string | null> => {
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT value FROM settings WHERE key = ? LIMIT 1')
    .bind(key)
    .first<{ value: string }>();
  return r ? String(r.value ?? '') : null;
};

export const getSettingInt = async (env: Env, key: string, fallback: number): Promise<number> => {
  const v = await getSetting(env, key);
  if (!v) return fallback;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getSettingBool = async (env: Env, key: string, fallback: boolean): Promise<boolean> => {
  const v = await getSetting(env, key);
  if (v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  if (['1','true','yes','on','ativo','enabled'].includes(s)) return true;
  if (['0','false','no','off','inativo','disabled'].includes(s)) return false;
  return fallback;
};

export const getMonthlyPlan = async (env: Env): Promise<PlanRow | null> => {
  const r = await env.SOS_EDITOR_DB
    .prepare("SELECT * FROM plans WHERE type='monthly' AND active=1 ORDER BY id ASC LIMIT 1")
    .first<PlanRow>();
  return r || null;
};

export const getPlanById = async (env: Env, id: number): Promise<PlanRow | null> => {
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM plans WHERE id = ?')
    .bind(id)
    .first<PlanRow>();
  return r || null;
};

export const updatePlan = async (env: Env, id: number, patch: Partial<PlanRow>): Promise<boolean> => {
  const current = await getPlanById(env, id);
  if (!current) return false;
  const sets: string[] = [];
  const binds: any[] = [];
  for (const k of Object.keys(patch) as (keyof PlanRow)[]) {
    if (k === 'id') continue;
    sets.push(`${k} = ?`);
    binds.push((patch as any)[k]);
  }
  if (!sets.length) return false;
  binds.push(id);
  const sql = `UPDATE plans SET ${sets.join(', ')} WHERE id = ?`;
  const info = await env.SOS_EDITOR_DB.prepare(sql).bind(...binds).run();
  return (info.meta.changes || 0) > 0;
};

// =============== Users ==================
export const getUserByDevice = async (env: Env, deviceId: string): Promise<UserRow | null> => {
  if (!deviceId) return null;
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM users WHERE device_id = ? LIMIT 1')
    .bind(deviceId)
    .first<UserRow>();
  return r || null;
};

export const getUserById = async (env: Env, id: number): Promise<UserRow | null> => {
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .bind(id)
    .first<UserRow>();
  return r || null;
};

export const getUserByEmail = async (env: Env, email: string): Promise<UserRow | null> => {
  if (!email) return null;
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<UserRow>();
  return r || null;
};

export interface CreateUserInput {
  device_id: string;
  email?: string | null;
  display_name?: string | null;
  ip_created?: string | null;
}

export const createUserDevice = async (env: Env, input: CreateUserInput): Promise<UserRow | null> => {
  const now = nowIso();
  // Duração trial: default 7 dias (conforme solicitado: "em 7 dias vai travar").
  // Admin pode mudar via painel Configurações > Trial (settings.trial_days e free_trial_enabled).
  let trialDays = await getSettingInt(env, 'trial_days', 7);
  const freeTrialEnabled = await getSettingBool(env, 'free_trial_enabled', true);
  if (!freeTrialEnabled) trialDays = 0;
  if (trialDays < 1) trialDays = 0;
  const trialEnds = trialDays >= 1 ? addDaysIso(trialDays) : now;
  const info = await env.SOS_EDITOR_DB.prepare(
    `INSERT INTO users
      (email, password, plan_id, created_at, trial_started_at, trial_ends_at, status,
       subscription_status, subscription_expires_at, device_id, last_seen_at,
       display_name, payment_provider, payment_ref, ip_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.email || null,
    null,
    null,
    now,
    trialDays >= 1 ? now : null,
    trialDays >= 1 ? trialEnds : null,
    'active',
    'none',
    null,
    input.device_id,
    now,
    input.display_name || null,
    null,
    null,
    input.ip_created || null
  ).run();
  const id = info.meta.last_row_id;
  if (!id) return null;
  return getUserById(env, Number(id));
};

export const touchUserLastSeen = async (env: Env, userId: number): Promise<void> => {
  await env.SOS_EDITOR_DB.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
    .bind(nowIso(), userId).run();
};

export const updateUserStatus = async (env: Env, userId: number, patch: Partial<UserRow>): Promise<boolean> => {
  const current = await getUserById(env, userId);
  if (!current) return false;
  const sets: string[] = [];
  const binds: any[] = [];
  const allowedCols: (keyof UserRow)[] = [
    'email','password','plan_id','trial_started_at','trial_ends_at','status',
    'subscription_status','subscription_expires_at','display_name','payment_provider','payment_ref'
  ];
  for (const k of allowedCols) {
    if (k in patch) { sets.push(`${k} = ?`); binds.push((patch as any)[k]); }
  }
  if (!sets.length) return false;
  binds.push(userId);
  const info = await env.SOS_EDITOR_DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds).run();
  return (info.meta.changes || 0) > 0;
};

export const listUsers = async (env: Env, q: string, page = 1, limit = 50): Promise<{ rows: UserRow[]; total: number }> => {
  const off = Math.max(0, (page - 1)) * limit;
  let where = '';
  const binds: any[] = [];
  if (q && q.trim()) {
    const qq = `%${q.trim()}%`;
    where = 'WHERE email LIKE ? OR device_id LIKE ? OR display_name LIKE ?';
    binds.push(qq, qq, qq);
  }
  const count = await env.SOS_EDITOR_DB.prepare(
    `SELECT COUNT(*) as c FROM users ${where}`
  ).bind(...binds).first<{ c: number }>();
  const rows = await env.SOS_EDITOR_DB.prepare(
    `SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, off).all<UserRow>();
  return { rows: rows.results || [], total: Number(count?.c || 0) };
};

// =============== Admin Access Grants ==================
export const getActiveGrantForUserId = async (env: Env, userId: number): Promise<GrantRow | null> => {
  const r = await env.SOS_EDITOR_DB.prepare(
    `SELECT * FROM admin_access_grants
      WHERE user_id = ? AND active = 1 AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1`
  ).bind(userId, nowIso()).first<GrantRow>();
  return r || null;
};

export const listGrants = async (env: Env, opts: {
  user_id?: number; active?: 0 | 1; page?: number; limit?: number;
}): Promise<{ rows: any[]; total: number }> => {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(500, Math.max(1, opts.limit || 50));
  const off = (page - 1) * limit;
  const conds: string[] = [];
  const binds: any[] = [];
  if (opts.user_id) { conds.push('g.user_id = ?'); binds.push(opts.user_id); }
  if (typeof opts.active === 'number') { conds.push('g.active = ?'); binds.push(opts.active); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const count = await env.SOS_EDITOR_DB.prepare(
    `SELECT COUNT(*) c FROM admin_access_grants g ${where}`
  ).bind(...binds).first<{ c: number }>();
  const rows = await env.SOS_EDITOR_DB.prepare(
    `SELECT g.*,
            u.email as user_email, u.device_id as user_device, u.display_name as user_name,
            a.username as granted_by_username,
            ar.username as revoked_by_username
       FROM admin_access_grants g
       LEFT JOIN users u ON u.id = g.user_id
       LEFT JOIN admin a ON a.id = g.granted_by_admin_id
       LEFT JOIN admin ar ON ar.id = g.revoked_by_admin_id
       ${where}
       ORDER BY g.id DESC
       LIMIT ? OFFSET ?`
  ).bind(...binds, limit, off).all<any>();
  return { rows: rows.results || [], total: Number(count?.c || 0) };
};

export const createGrant = async (env: Env, input: {
  user_id: number; admin_id: number; expires_at: string; reason?: string | null;
}): Promise<{ id: number } | null> => {
  const info = await env.SOS_EDITOR_DB.prepare(
    `INSERT INTO admin_access_grants
     (user_id, granted_by_admin_id, granted_at, expires_at, reason, active)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).bind(
    input.user_id, input.admin_id, nowIso(), input.expires_at, input.reason || null
  ).run();
  const id = info.meta.last_row_id;
  return id ? { id: Number(id) } : null;
};

export const getGrantById = async (env: Env, id: number): Promise<GrantRow | null> => {
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM admin_access_grants WHERE id = ? LIMIT 1')
    .bind(id).first<GrantRow>();
  return r || null;
};

export const revokeGrant = async (env: Env, id: number, adminId: number, reason: string | null): Promise<boolean> => {
  const info = await env.SOS_EDITOR_DB.prepare(
    `UPDATE admin_access_grants
        SET active = 0, revoked_at = ?, revoked_by_admin_id = ?, revoked_reason = ?
      WHERE id = ? AND active = 1`
  ).bind(nowIso(), adminId, reason || null, id).run();
  return (info.meta.changes || 0) > 0;
};

// =============== Audit Logs ==================
export interface LogAuditInput {
  env: Env;
  admin_id: number | null;
  action: string;
  target_type?: string | null;
  target_id?: number | null;
  old_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export const logAudit = async (input: LogAuditInput): Promise<void> => {
  try {
    await input.env.SOS_EDITOR_DB.prepare(
      `INSERT INTO admin_audit_logs
        (admin_user_id, action, target_type, target_id, old_value, new_value, reason,
         ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.admin_id ?? null,
      String(input.action).slice(0, 120),
      input.target_type || null,
      input.target_id ?? null,
      safeJson(input.old_value),
      safeJson(input.new_value),
      truncateText(input.reason, 1000),
      input.ip_address || null,
      truncateText(input.user_agent, 500),
      nowIso()
    ).run();
  } catch (e) {
    console.warn('[AUDIT FAIL]', e);
  }
};

export const listAuditLogs = async (env: Env, opts: {
  action?: string; target_type?: string; target_id?: number;
  admin_id?: number; q?: string; page?: number; limit?: number;
}): Promise<{ rows: any[]; total: number }> => {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(500, Math.max(1, opts.limit || 50));
  const off = (page - 1) * limit;
  const conds: string[] = [];
  const binds: any[] = [];
  if (opts.action) { conds.push('l.action = ?'); binds.push(opts.action); }
  if (opts.target_type) { conds.push('l.target_type = ?'); binds.push(opts.target_type); }
  if (typeof opts.target_id === 'number') { conds.push('l.target_id = ?'); binds.push(opts.target_id); }
  if (typeof opts.admin_id === 'number') { conds.push('l.admin_user_id = ?'); binds.push(opts.admin_id); }
  let qcond = '';
  if (opts.q && opts.q.trim()) {
    const qq = `%${opts.q.trim()}%`;
    qcond = '(l.old_value LIKE ? OR l.new_value LIKE ? OR l.reason LIKE ?)';
    binds.push(qq, qq, qq);
  }
  const all = [...conds, qcond ? qcond : null].filter(Boolean) as string[];
  const where = all.length ? 'WHERE ' + all.join(' AND ') : '';
  const count = await env.SOS_EDITOR_DB.prepare(
    `SELECT COUNT(*) c FROM admin_audit_logs l ${where}`
  ).bind(...binds).first<{ c: number }>();
  const rows = await env.SOS_EDITOR_DB.prepare(
    `SELECT l.*, a.username as admin_username
       FROM admin_audit_logs l
       LEFT JOIN admin a ON a.id = l.admin_user_id
       ${where}
       ORDER BY l.id DESC
       LIMIT ? OFFSET ?`
  ).bind(...binds, limit, off).all<any>();
  return { rows: rows.results || [], total: Number(count?.c || 0) };
};

// =============== Engine de Status (autoridade backend) ==================
// Prioridade: (1) user.status=blocked → allowed=false (ignora grant)
//             (2) grant active → admin_override_active allowed=true
//             (3) subscription active → subscription_active allowed=true
//             (4) trial active → trial allowed=true
//             (5) trial expirado/sem trial → trial_expired/no_trial allowed=false
export interface UserStatusResponse {
  user_id: number | null;
  device_id: string | null;
  status: string;
  allowed: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_days_left: number;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_days_left: number;
  user_status: string; // blocked/active
  grant_active: boolean;
  grant_id: number | null;
  grant_granted_at: string | null;
  grant_expires_at: string | null;
  grant_reason: string | null;
  grant_days_left: number;
}

export const buildUserStatus = (row: UserRow | null, grant: GrantRow | null): UserStatusResponse => {
  if (!row) {
    return {
      user_id: null, device_id: null, status: 'no_trial', allowed: false,
      trial_started_at: null, trial_ends_at: null, trial_days_left: 0,
      subscription_status: 'none', subscription_expires_at: null, subscription_days_left: 0,
      user_status: 'unknown',
      grant_active: false, grant_id: null, grant_granted_at: null,
      grant_expires_at: null, grant_reason: null, grant_days_left: 0,
    };
  }
  const now = Date.now();
  const trialStart = parseIsoDate(row.trial_started_at);
  const trialEnd = parseIsoDate(row.trial_ends_at);
  const subEnd = parseIsoDate(row.subscription_expires_at);
  const grantEnd = grant ? parseIsoDate(grant.expires_at) : 0;

  const trialDaysLeft = trialEnd > now ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0;
  const subDaysLeft = subEnd > now ? Math.max(0, Math.ceil((subEnd - now) / 86400000)) : 0;
  const grantDaysLeft = grantEnd > now ? Math.max(0, Math.ceil((grantEnd - now) / 86400000)) : 0;

  const userStatus = row.status && String(row.status).trim() ? row.status : 'active';
  if (userStatus === 'blocked') {
    return {
      user_id: Number(row.id), device_id: row.device_id, status: 'blocked', allowed: false,
      trial_started_at: row.trial_started_at, trial_ends_at: row.trial_ends_at, trial_days_left: trialDaysLeft,
      subscription_status: row.subscription_status, subscription_expires_at: row.subscription_expires_at, subscription_days_left: subDaysLeft,
      user_status: 'blocked',
      grant_active: false, grant_id: null, grant_granted_at: null,
      grant_expires_at: null, grant_reason: null, grant_days_left: 0,
    };
  }

  if (grant && grantDaysLeft > 0) {
    return {
      user_id: Number(row.id), device_id: row.device_id, status: 'admin_override_active', allowed: true,
      trial_started_at: row.trial_started_at, trial_ends_at: row.trial_ends_at, trial_days_left: trialDaysLeft,
      subscription_status: row.subscription_status, subscription_expires_at: row.subscription_expires_at, subscription_days_left: subDaysLeft,
      user_status: userStatus,
      grant_active: true, grant_id: Number(grant.id), grant_granted_at: grant.granted_at,
      grant_expires_at: grant.expires_at, grant_reason: grant.reason, grant_days_left: grantDaysLeft,
    };
  }

  const subActive = row.subscription_status === 'active' && subDaysLeft > 0;
  if (subActive) {
    return {
      user_id: Number(row.id), device_id: row.device_id, status: 'subscription_active', allowed: true,
      trial_started_at: row.trial_started_at, trial_ends_at: row.trial_ends_at, trial_days_left: trialDaysLeft,
      subscription_status: row.subscription_status, subscription_expires_at: row.subscription_expires_at, subscription_days_left: subDaysLeft,
      user_status: userStatus,
      grant_active: false, grant_id: null, grant_granted_at: null,
      grant_expires_at: null, grant_reason: null, grant_days_left: 0,
    };
  }

  if (trialDaysLeft > 0) {
    return {
      user_id: Number(row.id), device_id: row.device_id, status: 'trial', allowed: true,
      trial_started_at: row.trial_started_at, trial_ends_at: row.trial_ends_at, trial_days_left: trialDaysLeft,
      subscription_status: row.subscription_status, subscription_expires_at: row.subscription_expires_at, subscription_days_left: subDaysLeft,
      user_status: userStatus,
      grant_active: false, grant_id: null, grant_granted_at: null,
      grant_expires_at: null, grant_reason: null, grant_days_left: 0,
    };
  }

  const status = trialEnd && trialStart ? 'trial_expired' : 'no_trial';
  return {
    user_id: Number(row.id), device_id: row.device_id, status, allowed: false,
    trial_started_at: row.trial_started_at, trial_ends_at: row.trial_ends_at, trial_days_left: 0,
    subscription_status: row.subscription_status, subscription_expires_at: row.subscription_expires_at, subscription_days_left: subDaysLeft,
    user_status: userStatus,
    grant_active: false, grant_id: null, grant_granted_at: null,
    grant_expires_at: null, grant_reason: null, grant_days_left: 0,
  };
};

// =============== Downloads ==================
export const getAllDownloads = async (env: Env): Promise<DownloadRow[]> => {
  const res = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM downloads ORDER BY CASE os WHEN \'windows\' THEN 0 WHEN \'android\' THEN 1 WHEN \'ios\' THEN 2 ELSE 3 END, os ASC')
    .all<DownloadRow>();
  return (res.results || []).map(row => ({
    os: String(row.os),
    version: row.version ?? null,
    url: row.url ?? null,
    count: typeof row.count === 'number' ? row.count : (row.count ? parseInt(String(row.count), 10) : 0),
    active: typeof row.active === 'number' ? row.active : (row.active ? parseInt(String(row.active), 10) : 1),
  }));
};

export const getDownloadByOs = async (env: Env, os: string): Promise<DownloadRow | null> => {
  if (!os) return null;
  const r = await env.SOS_EDITOR_DB
    .prepare('SELECT * FROM downloads WHERE os = ? LIMIT 1')
    .bind(String(os)).first<DownloadRow>();
  if (!r) return null;
  return {
    os: String(r.os),
    version: r.version ?? null,
    url: r.url ?? null,
    count: typeof r.count === 'number' ? r.count : (r.count ? parseInt(String(r.count), 10) : 0),
    active: typeof r.active === 'number' ? r.active : (r.active ? parseInt(String(r.active), 10) : 1),
  };
};

export const updateDownload = async (env: Env, os: string, patch: Partial<Omit<DownloadRow, 'os'>> & { os?: string }): Promise<DownloadRow | null> => {
  if (!os) return null;
  const current = await getDownloadByOs(env, os);
  if (!current) return null;
  const allowedCols: (keyof DownloadRow)[] = ['version', 'url', 'count', 'active'];
  const sets: string[] = [];
  const binds: any[] = [];
  for (const k of allowedCols) {
    if (k in patch) {
      sets.push(`${k} = ?`);
      binds.push((patch as any)[k]);
    }
  }
  if (!sets.length) return current;
  binds.push(os);
  const sql = `UPDATE downloads SET ${sets.join(', ')} WHERE os = ?`;
  const info = await env.SOS_EDITOR_DB.prepare(sql).bind(...binds).run();
  if ((info.meta.changes || 0) <= 0) return current;
  return getDownloadByOs(env, os);
};

export const incrementDownloadCount = async (env: Env, os: string): Promise<DownloadRow | null> => {
  if (!os) return null;
  const current = await getDownloadByOs(env, os);
  if (!current) return null;
  const newCount = (current.count || 0) + 1;
  const info = await env.SOS_EDITOR_DB
    .prepare('UPDATE downloads SET count = ? WHERE os = ?')
    .bind(newCount, os)
    .run();
  if ((info.meta.changes || 0) <= 0) return current;
  return { ...current, count: newCount };
};
