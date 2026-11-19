import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import seed from '../src/seed/storybooks.json';

const TORI = 'b0000001-5b00-4c00-8000-000000000001'; // 4,900원, 미리보기 3쪽, 8쪽
const BRUSH = 'b0000001-5b00-4c00-8000-000000000005'; // 2,900원
const PW = 'story1234';
const PIN = '2580';

// 2단계 시나리오를 메모리 저장소와 PostgreSQL 에 똑같이 돌린다.
const targets: [string, string | undefined][] = [['메모리', '']];
if (process.env.TEST_DATABASE_URL) targets.push(['PostgreSQL', process.env.TEST_DATABASE_URL]);

async function resetDb(url: string) {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('TRUNCATE subscription_charges, subscriptions, library, payments, order_items, orders, reading_progress, wishlists, reviews, refunds, child_profiles, users CASCADE');
  for (const b of seed.books) await c.query('UPDATE books SET sales_count = $2 WHERE id = $1', [b.id, b.salesCount]);
  await c.end();
}

describe.each(targets)('판매 API (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  let n = 0;
  const email = () => `parent${Date.now()}${n++}@example.com`;

  async function signup(e = email()) {
    const res = await api()
      .post('/api/v1/auth/signup')
      .send({ email: e, password: PW, parentPin: PIN, nickname: '토리맘', agreeTerms: true, parentConfirmed: true })
      .expect(201);
    return { email: e, ...res.body } as { email: string; accessToken: string; refreshToken: string; user: { id: string } };
  }
  async function parentToken(access: string) {
    const r = await api().post('/api/v1/parent/verify').set(bearer(access)).send({ pin: PIN }).expect(200);
    return r.body.parentToken as string;
  }
  async function buy(access: string, bookId: string, key = `key-${Date.now()}-${n++}`) {
    const pt = await parentToken(access);
    const h = { ...bearer(access), 'X-Parent-Token': pt };
    const order = (await api().post('/api/v1/orders').set(h).send({ bookIds: [bookId], idempotencyKey: key }).expect(201)).body;
    const co = (await api().post('/api/v1/payments/test/checkout').set(h).send({ orderId: order.id, outcome: 'success' }).expect(200)).body;
    const v = await api().post('/api/v1/payments/verify').set(h).send({ orderId: order.id, provider: 'TEST', productId: co.productId, purchaseToken: co.purchaseToken });
    return { order, co, v, h };
  }

  beforeAll(async () => {
    if (databaseUrl) await resetDb(databaseUrl);
    app = await createApp({ databaseUrl, logger: false });
  });
  afterAll(async () => {
    await app?.close();
    if (databaseUrl) await resetDb(databaseUrl);
  });

  describe('회원가입·로그인', () => {
    it('입력 검증: 약한 비밀번호, PIN 형식, 약관·보호자 미동의', async () => {
      const base = { email: email(), password: PW, parentPin: PIN, agreeTerms: true, parentConfirmed: true };
      await api().post('/api/v1/auth/signup').send({ ...base, password: 'short1' }).expect(400);
      await api().post('/api/v1/auth/signup').send({ ...base, password: 'onlyletters' }).expect(400);
      await api().post('/api/v1/auth/signup').send({ ...base, parentPin: '12a4' }).expect(400);
      await api().post('/api/v1/auth/signup').send({ ...base, agreeTerms: false }).expect(400);
      const r = await api().post('/api/v1/auth/signup').send({ ...base, parentConfirmed: false }).expect(400);
      expect(r.body.message).toContain('보호자');
    });

    it('가입 → 같은 이메일(대소문자 달라도) 중복 거절', async () => {
      const u = await signup();
      expect(u.accessToken).toBeTruthy();
      expect(u.user).toMatchObject({ email: u.email, nickname: '토리맘' });
      const dup = await api()
        .post('/api/v1/auth/signup')
        .send({ email: u.email.toUpperCase(), password: PW, parentPin: PIN, agreeTerms: true, parentConfirmed: true })
        .expect(409);
      expect(dup.body.code).toBe('EMAIL_TAKEN');
    });

    it('로그인 성공·실패, 내 정보는 로그인해야', async () => {
      const u = await signup();
      const bad = await api().post('/api/v1/auth/login').send({ email: u.email, password: 'wrong1234' }).expect(401);
      expect(bad.body.code).toBe('INVALID_LOGIN');
      const ok = await api().post('/api/v1/auth/login').send({ email: u.email, password: PW }).expect(200);
      await api().get('/api/v1/users/me').expect(401);
      const me = await api().get('/api/v1/users/me').set(bearer(ok.body.accessToken)).expect(200);
      expect(me.body.email).toBe(u.email);
      expect(me.body).not.toHaveProperty('passwordHash');
    });

    it('토큰 갱신, 로그아웃하면 기존 토큰 모두 무효', async () => {
      const u = await signup();
      const r = await api().post('/api/v1/auth/refresh').send({ refreshToken: u.refreshToken }).expect(200);
      await api().get('/api/v1/users/me').set(bearer(r.body.accessToken)).expect(200);
      await api().post('/api/v1/auth/refresh').send({ refreshToken: u.accessToken }).expect(401); // access 를 refresh 로 못 씀
      await api().post('/api/v1/auth/logout').set(bearer(u.accessToken)).expect(204);
      await api().get('/api/v1/users/me').set(bearer(r.body.accessToken)).expect(401);
      await api().post('/api/v1/auth/refresh').send({ refreshToken: u.refreshToken }).expect(401);
    });
  });

  describe('보호자 확인', () => {
    it('틀리면 횟수 안내, 5번 틀리면 잠금', async () => {
      const u = await signup();
      for (let i = 1; i <= 4; i++) {
        const r = await api().post('/api/v1/parent/verify').set(bearer(u.accessToken)).send({ pin: '0000' }).expect(403);
        expect(r.body.code).toBe('PIN_WRONG');
        expect(r.body.message).toContain(`(${i}/5)`);
      }
      const locked = await api().post('/api/v1/parent/verify').set(bearer(u.accessToken)).send({ pin: '0000' }).expect(403);
      expect(locked.body.code).toBe('PIN_LOCKED');
      const still = await api().post('/api/v1/parent/verify').set(bearer(u.accessToken)).send({ pin: PIN }).expect(429);
      expect(still.body.code).toBe('PIN_LOCKED'); // 맞는 PIN 도 잠금 중엔 거절
    });

    it('보호자 토큰 없이 주문하면 거절', async () => {
      const u = await signup();
      const r = await api().post('/api/v1/orders').set(bearer(u.accessToken)).send({ bookIds: [TORI], idempotencyKey: 'no-parent-1' }).expect(401);
      expect(r.body.code).toBe('PARENT_REQUIRED');
    });

    it('다른 사람의 보호자 토큰은 못 씀', async () => {
      const a = await signup();
      const b = await signup();
      const ptA = await parentToken(a.accessToken);
      const r = await api()
        .post('/api/v1/orders')
        .set({ ...bearer(b.accessToken), 'X-Parent-Token': ptA })
        .send({ bookIds: [TORI], idempotencyKey: 'other-parent-1' })
        .expect(401);
      expect(r.body.code).toBe('PARENT_REQUIRED');
    });
  });

  describe('주문·테스트 결제·구매 권한', () => {
    it('구매 전: 상세 owned=false, 미리보기 밖 페이지 403', async () => {
      const u = await signup();
      const d = await api().get(`/api/v1/books/${TORI}`).set(bearer(u.accessToken)).expect(200);
      expect(d.body).toMatchObject({ owned: false, storeProductId: 'storybook_001' });
      await api().get(`/api/v1/books/${TORI}/pages/5`).set(bearer(u.accessToken)).expect(403);
      await api().get(`/api/v1/library/${TORI}/pages`).set(bearer(u.accessToken)).expect(403);
    });

    it('주문은 서버 가격, 같은 키로 두 번 눌러도 주문 1건', async () => {
      const u = await signup();
      const pt = await parentToken(u.accessToken);
      const h = { ...bearer(u.accessToken), 'X-Parent-Token': pt };
      const a = await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'same-key-001' }).expect(201);
      const b = await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'same-key-001' }).expect(201);
      expect(a.body).toMatchObject({ status: 'PENDING', totalAmount: 4900 });
      expect(b.body.id).toBe(a.body.id);
      const list = await api().get('/api/v1/orders').set(bearer(u.accessToken)).expect(200);
      expect(list.body).toHaveLength(1);
      await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'x', price: 100 }).expect(400); // 가격 등 모르는 값 거절
    });

    it('테스트 결제 → 서버 검증 → 내 서재 등록 → 전체 페이지 열람', async () => {
      const u = await signup();
      const { v } = await buy(u.accessToken, TORI);
      expect(v.status).toBe(200);
      expect(v.body).toMatchObject({ success: true, paymentStatus: 'PAID', entitlementGranted: true, bookIds: [TORI] });
      expect(v.body.order.payment.provider).toBe('TEST');

      const lib = await api().get('/api/v1/library').set(bearer(u.accessToken)).expect(200);
      expect(lib.body.map((x: { book: { id: string } }) => x.book.id)).toEqual([TORI]);
      const d = await api().get(`/api/v1/books/${TORI}`).set(bearer(u.accessToken)).expect(200);
      expect(d.body.owned).toBe(true);
      await api().get(`/api/v1/books/${TORI}/pages/8`).set(bearer(u.accessToken)).expect(200);
      const all = await api().get(`/api/v1/library/${TORI}/pages`).set(bearer(u.accessToken)).expect(200);
      expect(all.body.pages).toHaveLength(8);
      expect((await api().get(`/api/v1/library/${TORI}/pages/8`).set(bearer(u.accessToken)).expect(200)).body.pageNumber).toBe(8);
    });

    it('같은 영수증으로 다시 검증해도 결과 같음(멱등), 이미 산 책은 다시 주문 못 함', async () => {
      const u = await signup();
      const { order, co, h } = await buy(u.accessToken, BRUSH);
      const again = await api().post('/api/v1/payments/verify').set(h).send({ orderId: order.id, provider: 'TEST', productId: co.productId, purchaseToken: co.purchaseToken }).expect(200);
      expect(again.body.success).toBe(true);
      const owned = await api().post('/api/v1/orders').set(h).send({ bookIds: [BRUSH], idempotencyKey: 'buy-again-01' }).expect(409);
      expect(owned.body.code).toBe('ALREADY_OWNED');
      const lib = await api().get('/api/v1/library').set(bearer(u.accessToken)).expect(200);
      expect(lib.body).toHaveLength(1);
    });

    it('영수증을 다른 주문·다른 사람에게 쓰면 거절', async () => {
      const a = await signup();
      const b = await signup();
      const { co } = await buy(a.accessToken, TORI);
      // A 의 다른 주문에 같은 영수증
      const ptA = await parentToken(a.accessToken);
      const hA = { ...bearer(a.accessToken), 'X-Parent-Token': ptA };
      const o2 = (await api().post('/api/v1/orders').set(hA).send({ bookIds: [BRUSH], idempotencyKey: 'reuse-key-01' }).expect(201)).body;
      const m = await api().post('/api/v1/payments/verify').set(hA).send({ orderId: o2.id, provider: 'TEST', productId: co.productId, purchaseToken: co.purchaseToken }).expect(400);
      expect(m.body.code).toBe('RECEIPT_ORDER_MISMATCH');
      // B 가 A 의 영수증
      const ptB = await parentToken(b.accessToken);
      const hB = { ...bearer(b.accessToken), 'X-Parent-Token': ptB };
      const oB = (await api().post('/api/v1/orders').set(hB).send({ bookIds: [TORI], idempotencyKey: 'steal-key-01' }).expect(201)).body;
      const s = await api().post('/api/v1/payments/verify').set(hB).send({ orderId: oB.id, provider: 'TEST', productId: co.productId, purchaseToken: co.purchaseToken }).expect(400);
      expect(s.body.code).toBe('INVALID_RECEIPT');
      // B 는 A 의 주문을 볼 수 없다
      const lib = (await api().get('/api/v1/library').set(bearer(b.accessToken)).expect(200)).body;
      expect(lib).toHaveLength(0);
      await api().get(`/api/v1/orders/${o2.id}`).set(bearer(b.accessToken)).expect(404);
    });

    it('위조·엉터리 영수증 거절', async () => {
      const u = await signup();
      const pt = await parentToken(u.accessToken);
      const h = { ...bearer(u.accessToken), 'X-Parent-Token': pt };
      const o = (await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'fake-rcpt-01' }).expect(201)).body;
      const r = await api().post('/api/v1/payments/verify').set(h).send({ orderId: o.id, provider: 'TEST', purchaseToken: 'aaa.bbb.ccc' }).expect(400);
      expect(r.body.code).toBe('INVALID_RECEIPT');
      const st = (await api().get(`/api/v1/orders/${o.id}`).set(bearer(u.accessToken)).expect(200)).body;
      expect(st.status).toBe('PENDING');
    });

    it('결제창 취소 → 주문 취소, 취소된 주문은 결제 불가', async () => {
      const u = await signup();
      const pt = await parentToken(u.accessToken);
      const h = { ...bearer(u.accessToken), 'X-Parent-Token': pt };
      const o = (await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'cancel-key-1' }).expect(201)).body;
      const c = await api().post('/api/v1/payments/test/checkout').set(h).send({ orderId: o.id, outcome: 'cancel' }).expect(200);
      expect(c.body.order.status).toBe('CANCELED');
      await api().post('/api/v1/payments/test/checkout').set(h).send({ orderId: o.id, outcome: 'success' }).expect(409);
      expect((await api().get('/api/v1/library').set(bearer(u.accessToken))).body).toHaveLength(0);
      // 새 주문(새 키)으로는 다시 살 수 있다
      const { v } = await buy(u.accessToken, TORI, 'cancel-key-2');
      expect(v.status).toBe(200);
    });

    it('스토어 결제가 아직 설정되지 않았으면 503 안내', async () => {
      const u = await signup();
      const pt = await parentToken(u.accessToken);
      const h = { ...bearer(u.accessToken), 'X-Parent-Token': pt };
      const o = (await api().post('/api/v1/orders').set(h).send({ bookIds: [TORI], idempotencyKey: 'google-key-1' }).expect(201)).body;
      const r = await api().post('/api/v1/payments/verify').set(h).send({ orderId: o.id, provider: 'GOOGLE_PLAY', productId: 'storybook_001', purchaseToken: 'x' }).expect(503);
      expect(r.body.code).toBe('PROVIDER_NOT_CONFIGURED');
      const opt = (await api().get('/api/v1/payments/options').set(bearer(u.accessToken)).expect(200)).body;
      expect(opt).toEqual({ providers: ['TEST'], testMode: true });
    });

    it('구매 복구: 이미 있는 책은 그대로, 엉터리 영수증은 실패로 셈', async () => {
      const u = await signup();
      const { co } = await buy(u.accessToken, TORI);
      const r = await api()
        .post('/api/v1/payments/restore')
        .set(bearer(u.accessToken))
        .send({ provider: 'TEST', purchases: [{ productId: co.productId, purchaseToken: co.purchaseToken }, { productId: 'storybook_002', purchaseToken: 'bad' }] })
        .expect(200);
      expect(r.body).toEqual({ restored: 0, alreadyOwned: 1, failed: 1 });
    });
  });

  describe('정보 수정·탈퇴', () => {
    it('비밀번호 변경: 지금 비밀번호 확인, 바꾸면 다른 토큰 무효', async () => {
      const u = await signup();
      const pt = await parentToken(u.accessToken);
      const h = { ...bearer(u.accessToken), 'X-Parent-Token': pt };
      await api().patch('/api/v1/users/me').set(bearer(u.accessToken)).send({ nickname: 'x' }).expect(401); // 보호자 확인 필요
      const wrong = await api().patch('/api/v1/users/me').set(h).send({ currentPassword: 'nope12345', newPassword: 'newpass123' }).expect(403);
      expect(wrong.body.code).toBe('PASSWORD_WRONG');
      const ok = await api().patch('/api/v1/users/me').set(h).send({ currentPassword: PW, newPassword: 'newpass123' }).expect(200);
      expect(ok.body.accessToken).toBeTruthy();
      await api().get('/api/v1/users/me').set(bearer(u.accessToken)).expect(401);
      await api().post('/api/v1/auth/login').send({ email: u.email, password: 'newpass123' }).expect(200);
    });

    it('탈퇴하면 로그인·토큰 모두 불가, 같은 이메일로 다시 가입 가능', async () => {
      const u = await signup();
      await buy(u.accessToken, TORI);
      const pt = await parentToken(u.accessToken);
      await api().delete('/api/v1/users/me').set(bearer(u.accessToken)).expect(401);
      await api().delete('/api/v1/users/me').set({ ...bearer(u.accessToken), 'X-Parent-Token': pt }).expect(204);
      await api().get('/api/v1/users/me').set(bearer(u.accessToken)).expect(401);
      await api().post('/api/v1/auth/login').send({ email: u.email, password: PW }).expect(401);
      const again = await signup(u.email);
      expect((await api().get('/api/v1/library').set(bearer(again.accessToken))).body).toHaveLength(0);
    });
  });
});
