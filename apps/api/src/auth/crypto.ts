import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/**
 * 토큰 서명 키.
 * JWT_SECRET 이 있으면 그것을, 없으면 DATABASE_URL 에서 만든다(배포 환경에 비밀값을 하나 더 넣지 않아도 되게).
 * 둘 다 없으면 개발용 고정값 — 로컬·테스트 전용.
 */
export function signingKey(): Buffer {
  // Supabase-Vercel 연결이 넣어 주는 SUPABASE_JWT_SECRET 은 DB 비밀번호가 바뀌어도 그대로라 로그인이 풀리지 않는다
  const db = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const base = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || (db ? `db:${db}` : 'dev-only-storybook-secret');
  return createHash('sha256').update(`storybook-jwt|${base}`).digest();
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export interface TokenPayload {
  sub: string; // 사용자 ID
  typ: 'access' | 'refresh' | 'parent' | 'test-receipt';
  ver?: number; // users.token_version
  exp: number; // 만료 (초)
  [k: string]: unknown;
}

/** HS256 JWT 만들기 */
export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds: number, key = signingKey()): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = b64url(createHmac('sha256', key).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

/** 서명·만료·종류를 확인하고 내용을 돌려준다. 틀리면 null */
export function verifyToken(token: string | undefined, typ: TokenPayload['typ'], key = signingKey()): TokenPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', key).update(`${header}.${body}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (p.typ !== typ || typeof p.exp !== 'number' || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

/** 비밀번호·PIN 해시 (scrypt, 저장 형식: scrypt$salt$hash) */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(secret, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(secret, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}
