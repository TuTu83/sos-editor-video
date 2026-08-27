import * as jose from 'jose';
import { getSecretKey } from './util';
import type { Env } from '../types';

export interface JwtAdminPayload {
  sub?: string | number;
  admin_id?: number;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export const hashPassword = async (plain: string): Promise<string> => {
  // compat bcryptjs (não temos bcrypt nativo no Workers; usamos bcryptjs)
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(plain, 10);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcryptjs');
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
};

export const signAdminToken = async (env: Env, adminId: number, username: string): Promise<string> => {
  const secret = new TextEncoder().encode(getSecretKey(env));
  const jwt = await new jose.SignJWT({ admin_id: adminId, username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(adminId))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
  return jwt;
};

export const verifyAdminToken = async (env: Env, token: string): Promise<JwtAdminPayload | null> => {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(getSecretKey(env));
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as JwtAdminPayload;
  } catch {
    return null;
  }
};

export const extractBearer = (r: Request): string | null => {
  const auth = r.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1].trim() : null;
};
