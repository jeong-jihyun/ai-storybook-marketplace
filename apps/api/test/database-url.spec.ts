import { resolveDatabaseUrl, sslOption } from '../src/common/database-url';

describe('DB 주소 찾기', () => {
  const env = { ...process.env };
  afterEach(() => (process.env = { ...env }));

  it('Supabase-Vercel 연결이 넣는 POSTGRES_URL 을 쓰고, sslmode 같은 옵션은 빼고 SSL 은 켠다', () => {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = 'postgres://postgres.abc:p%40ss@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x';
    const u = resolveDatabaseUrl()!;
    expect(u).toBe('postgres://postgres.abc:p%40ss@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres');
    expect(sslOption(u)).toEqual({ rejectUnauthorized: false });
  });

  it('DATABASE_URL 이 있으면 그걸 먼저, 로컬 DB 는 SSL 끔, 둘 다 없으면 없음', () => {
    process.env.DATABASE_URL = 'postgres://postgres@localhost:5432/storybook';
    process.env.POSTGRES_URL = 'postgres://other';
    delete process.env.DATABASE_SSL;
    expect(resolveDatabaseUrl()).toBe('postgres://postgres@localhost:5432/storybook');
    expect(sslOption(resolveDatabaseUrl()!)).toBe(false);
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    expect(resolveDatabaseUrl()).toBeUndefined();
  });
});
