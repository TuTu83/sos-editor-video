import type { Env } from '../types';

const DEFAULT_SECRET = 'sos-secret-key-change-me';
export const getSecretKey = (env: Env): string => env.SECRET_KEY?.trim() || DEFAULT_SECRET;

export const nowIso = (): string => new Date().toISOString();

export const parseIsoDate = (s: string | null | undefined): number => {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
};

export const daysBetweenNowAnd = (iso: string | null | undefined): number => {
  const ms = parseIsoDate(iso) - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
};

export const addDaysIso = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, days | 0));
  return d.toISOString();
};

export const truncateText = (s: unknown, max = 8000): string | null => {
  if (s === null || s === undefined) return null;
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  return str.length > max ? str.slice(0, max) : str;
};

export const safeJson = (o: unknown): string | null => {
  try { return truncateText(JSON.stringify(o)); } catch { return null; }
};

export const extractClientIp = (request: Request, info?: ExecutionContext | any): string => {
  const xff = request.headers.get('CF-Connecting-IP') ||
              request.headers.get('X-Forwarded-For') ||
              request.headers.get('X-Real-IP');
  if (xff) return xff.split(',')[0].trim();
  try {
    // Cloudflare request.cf (em runtime / dev pode existir como propriedade)
    const anyReq = request as any;
    if (anyReq?.cf?.clientIp) return String(anyReq.cf.clientIp);
  } catch {}
  return '0.0.0.0';
};

export const readUserAgent = (r: Request): string => r.headers.get('User-Agent') || '';

export const isValidMimeVideo = (m: string | null): boolean => {
  if (!m) return false;
  const ALLOWED = ['video/mp4','video/x-matroska','video/quicktime','video/x-msvideo','video/webm'];
  return ALLOWED.includes(m.toLowerCase());
};
