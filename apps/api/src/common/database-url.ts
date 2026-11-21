/**
 * DB 접속 주소 찾기
 * - DATABASE_URL (직접 넣은 값) → POSTGRES_URL (Supabase-Vercel 공식 연결이 자동으로 넣는 값) 순서
 * - Supabase 연결 주소의 sslmode=require 는 최신 pg 드라이버에서 인증서 끝까지 검증(verify-full)으로 처리되어
 *   접속이 거부될 수 있으므로 빼고, SSL 은 아래 sslOption 으로 켠다.
 */
export function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    for (const k of ['sslmode', 'supa', 'pgbouncer', 'sslrootcert']) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return raw;
  }
}

/** SSL 이 필요한 곳(Supabase 등)이면 암호화 연결 */
export function sslOption(url: string): false | { rejectUnauthorized: boolean } {
  const need = process.env.DATABASE_SSL === 'true' || /supabase\.(co|com)/.test(url);
  return need ? { rejectUnauthorized: false } : false;
}
