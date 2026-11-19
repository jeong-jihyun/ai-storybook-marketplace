import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import seed from '../src/seed/storybooks.json';

const BOOKS = seed.books.map((b) => b.id);
const PW = 'story1234';
const PIN = '2580';
const DAY = 24 * 3600 * 1000;

// 날짜를 앞당겨 구독 갱신·만료를 시험한다
const clock = { t: Date.now(), now: () => new Date(clock.t) };

const targets: [string, string | undefined][] = [['메모리', '']];
if (process.env.TEST_DATABASE_URL) targets.push(['PostgreSQL', process.env.TEST_DATABASE_URL]);

async function resetDb(url: string) {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('TRUNCATE subscription_charges, subscriptions, library, payments, order_items, orders, users CASCADE');
  for (const b of seed.books) await c.query('UPDATE books SET sales_count = $2 WHERE id = $1', [b.id, b.salesCount]);
  await c.end();
}

describe.each(targets)('구독 소장권 (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  let n = 0;

  async function user() {
    const r = await api()
      .post('/api/v1/auth/signup')
      .send({ email: `sub${Date.now()}${n++}@example.com`, password: PW, parentPin: PIN, agreeTerms: true, parentConfirmed: true })
      .expect(201);
    const access = r.body.accessToken as string;
    const pt = (await api().post('/api/v1/parent/verify').set('Authorization', `Bearer ${access}`).send({ pin: PIN }).expect(200)).body.parentToken;
    return { access, h: { Authorization: `Bearer ${access}`, 'X-Parent-Token': pt } };
  }
  async function subscribe(h: Record<string, string>) {
    const co = (await api().post('/api/v1/subscriptions/test/checkout').set(h).send({ planCode: 'monthly_3', outcome: 'success' }).expect(200)).body;
    const v = await api().post('/api/v1/subscriptions/verify').set(h).send({ provider: 'TEST', productId: co.productId, purchaseToken: co.purchaseToken });
    return { co, v };
  }
  const me = async (h: Record<string, string>) => (await api().get('/api/v1/subscriptions/me').set(h).expect(200)).body.subscription;
  const redeem = (h: Record<string, string>, bookId: string) => api().post('/api/v1/subscriptions/redeem').set(h).send({ bookId });

  beforeAll(async () => {
    if (databaseUrl) await resetDb(databaseUrl);
    app = await createApp({ databaseUrl, logger: false, clock });
  });
  afterAll(async () => {
    await app?.close();
    if (databaseUrl) await resetDb(databaseUrl);
  });
  beforeEach(() => (clock.t = Date.now()));

  it('요금제: 월 6,900원, 매달 3권 (로그인 없이 볼 수 있음)', async () => {
    const r = await api().get('/api/v1/subscriptions/plans').expect(200);
    expect(r.body).toEqual([expect.objectContaining({ code: 'monthly_3', price: 6900, creditsPerPeriod: 3, periodDays: 30 })]);
  });

  it('보호자 확인 없이는 구독 결제 못 함, 결제창 취소면 구독 없음', async () => {
    const { access, h } = await user();
    await api().post('/api/v1/subscriptions/test/checkout').set('Authorization', `Bearer ${access}`).send({ planCode: 'monthly_3', outcome: 'success' }).expect(401);
    const c = await api().post('/api/v1/subscriptions/test/checkout').set(h).send({ planCode: 'monthly_3', outcome: 'cancel' }).expect(200);
    expect(c.body).toEqual({ outcome: 'cancel' });
    expect(await me(h)).toBeNull();
  });

  it('구독 시작 → 소장권 3장, 같은 영수증은 한 번만, 중복 구독 거절', async () => {
    const { h } = await user();
    const { co, v } = await subscribe(h);
    expect(v.status).toBe(200);
    expect(v.body).toMatchObject({ success: true, result: 'STARTED', subscription: { creditsRemaining: 3, cancelAtPeriodEnd: false, status: 'ACTIVE', provider: 'TEST' } });
    const s = v.body.subscription;
    expect(new Date(s.currentPeriodEnd).getTime() - new Date(s.currentPeriodStart).getTime()).toBe(30 * DAY);
    const again = await api().post('/api/v1/subscriptions/verify').set(h).send({ provider: 'TEST', purchaseToken: co.purchaseToken }).expect(200);
    expect(again.body.result).toBe('ALREADY_APPLIED');
    const dup = await api().post('/api/v1/subscriptions/test/checkout').set(h).send({ planCode: 'monthly_3', outcome: 'success' }).expect(409);
    expect(dup.body.code).toBe('ALREADY_SUBSCRIBED');
  });

  it('남의 구독 영수증·책 영수증은 구독에 못 씀', async () => {
    const a = await user();
    const b = await user();
    const { co } = await subscribe(a.h);
    const steal = await api().post('/api/v1/subscriptions/verify').set(b.h).send({ provider: 'TEST', purchaseToken: co.purchaseToken }).expect(400);
    expect(steal.body.code).toBe('INVALID_RECEIPT');
    // 책 영수증 → 구독 검증
    const order = (await api().post('/api/v1/orders').set(b.h).send({ bookIds: [BOOKS[0]], idempotencyKey: `sub-order-${n++}` }).expect(201)).body;
    const bookRcpt = (await api().post('/api/v1/payments/test/checkout').set(b.h).send({ orderId: order.id, outcome: 'success' }).expect(200)).body;
    await api().post('/api/v1/subscriptions/verify').set(b.h).send({ provider: 'TEST', purchaseToken: bookRcpt.purchaseToken }).expect(400);
    // 구독 영수증 → 책 결제 검증
    const own = await subscribe(b.h);
    await api().post('/api/v1/payments/verify').set(b.h).send({ orderId: order.id, provider: 'TEST', purchaseToken: own.co.purchaseToken }).expect(400);
  });

  it('소장권으로 3권 받기 → 4권째는 거절, 받은 책은 끝까지 읽기·출처 표시', async () => {
    const { access, h } = await user();
    await subscribe(h);
    for (let i = 0; i < 3; i++) {
      const r = await redeem(h, BOOKS[i]).expect(200);
      expect(r.body).toEqual({ bookId: BOOKS[i], creditsRemaining: 2 - i });
    }
    const none = await redeem(h, BOOKS[3]).expect(409);
    expect(none.body.code).toBe('NO_CREDIT');
    expect(none.body.message).toContain('새로 채워져요');
    const owned = await redeem(h, BOOKS[0]).expect(409);
    expect(owned.body.code).toBe('ALREADY_OWNED');
    const lib = (await api().get('/api/v1/library').set('Authorization', `Bearer ${access}`).expect(200)).body;
    expect(lib).toHaveLength(3);
    expect(lib.every((x: { source: string }) => x.source === 'SUBSCRIPTION')).toBe(true);
    await api().get(`/api/v1/library/${BOOKS[2]}/pages`).set('Authorization', `Bearer ${access}`).expect(200);
    const detail = (await api().get(`/api/v1/books/${BOOKS[1]}`).set('Authorization', `Bearer ${access}`).expect(200)).body;
    expect(detail.owned).toBe(true);
    // 산 책을 다시 주문하면 거절 (소장권으로 받은 책도 내 것)
    await api().post('/api/v1/orders').set(h).send({ bookIds: [BOOKS[0]], idempotencyKey: `own-order-${n++}` }).expect(409);
  });

  it('한 달이 지나면 자동 갱신: 소장권 3장으로 다시 채움(넘어가지 않음)', async () => {
    const { h } = await user();
    const first = (await subscribe(h)).v.body.subscription;
    await redeem(h, BOOKS[4]).expect(200);
    clock.t += 31 * DAY;
    const s = await me(h);
    expect(s).toMatchObject({ creditsRemaining: 3, status: 'ACTIVE' });
    expect(s.currentPeriodStart).toBe(first.currentPeriodEnd);
    clock.t += 65 * DAY; // 두 달 더 → 이어서 갱신
    const later = await me(h);
    expect(new Date(later.currentPeriodEnd).getTime()).toBeGreaterThan(clock.t);
  });

  it('해지 예약: 기간 끝까지 사용 → 끝나면 만료, 받은 책은 남고 다시 구독 가능', async () => {
    const { access, h } = await user();
    await subscribe(h);
    const c = await api().post('/api/v1/subscriptions/cancel').set(h).expect(200);
    expect(c.body.cancelAtPeriodEnd).toBe(true);
    const r = await api().post('/api/v1/subscriptions/resume').set(h).expect(200);
    expect(r.body.cancelAtPeriodEnd).toBe(false);
    await api().post('/api/v1/subscriptions/cancel').set(h).expect(200);
    await redeem(h, BOOKS[5]).expect(200); // 해지 예약 중에도 사용 가능
    clock.t += 31 * DAY;
    expect(await me(h)).toBeNull();
    const after = await redeem(h, BOOKS[6]).expect(403);
    expect(after.body.code).toBe('NO_SUBSCRIPTION');
    const lib = (await api().get('/api/v1/library').set('Authorization', `Bearer ${access}`).expect(200)).body;
    expect(lib.map((x: { book: { id: string } }) => x.book.id)).toEqual([BOOKS[5]]);
    const again = await subscribe(h);
    expect(again.v.body.result).toBe('STARTED');
    await api().post('/api/v1/subscriptions/cancel').set({ Authorization: `Bearer ${access}` }).expect(401); // 해지도 보호자 확인
  });

  it('구독 안 했으면 소장권 거절, 공개 화면은 틀린 토큰이어도 손님으로', async () => {
    const { h } = await user();
    const r = await redeem(h, BOOKS[0]).expect(403);
    expect(r.body.code).toBe('NO_SUBSCRIPTION');
    const d = await api().get(`/api/v1/books/${BOOKS[0]}`).set('Authorization', 'Bearer broken.token.value').expect(200);
    expect(d.body.owned).toBe(false);
    await api().get('/api/v1/users/me').set('Authorization', 'Bearer broken.token.value').expect(401);
  });
});
