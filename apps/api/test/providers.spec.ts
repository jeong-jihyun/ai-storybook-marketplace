import { generateKeyPairSync } from 'node:crypto';
import { AppleIAPProvider } from '../src/commerce/providers/apple.provider';
import { GooglePlayBillingProvider } from '../src/commerce/providers/google-play.provider';

// 실제 스토어에 연결하지 않고, 가짜 응답으로 검증 로직만 확인한다.
type Call = { url: string; init?: RequestInit };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('구글 플레이 검증', () => {
  const env = { ...process.env };
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  beforeEach(() => {
    process.env.GOOGLE_PLAY_PACKAGE_NAME = 'com.jeongjihyun.donghwasup';
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: 'bot@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  });
  afterAll(() => (process.env = env));

  function fake(purchase: object, status = 200) {
    const calls: Call[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('oauth2')) return json(200, { access_token: 'tok', expires_in: 3600 });
      if (url.endsWith(':acknowledge')) return json(200, {});
      return json(status, purchase);
    }) as unknown as typeof fetch;
    return { provider: new GooglePlayBillingProvider(f), calls };
  }

  it('설정이 없으면 꺼져 있다', () => {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    expect(new GooglePlayBillingProvider().isEnabled()).toBe(false);
  });

  it('구매됨 + 미확인이면 확인(acknowledge)까지 하고 거래번호를 돌려준다', async () => {
    const { provider, calls } = fake({ purchaseState: 0, acknowledgementState: 0, orderId: 'GPA.1234', obfuscatedExternalAccountId: 'user-1' });
    const r = await provider.verify({ userId: 'user-1', orderId: 'o1', productId: 'storybook_001', purchaseToken: 'pt' });
    expect(r).toMatchObject({ transactionId: 'GPA.1234', productId: 'storybook_001', state: 'PURCHASED' });
    expect(calls.some((c) => c.url.endsWith(':acknowledge'))).toBe(true);
    expect(calls[1].url).toContain('/purchases/products/storybook_001/tokens/pt');
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('구독: 활성 + 미확인이면 확인 처리, 만료일·주문번호를 돌려준다', async () => {
    const expiry = new Date(Date.now() + 20 * 86400_000).toISOString();
    const { provider, calls } = fake({
      subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
      latestOrderId: 'GPA.5555..1',
      lineItems: [{ productId: 'storybook_sub_monthly_3', expiryTime: expiry }],
      externalAccountIdentifiers: { obfuscatedExternalAccountId: 'u1' },
    });
    const r = await provider.verifySubscription({ userId: 'u1', productId: null, purchaseToken: 'tok' });
    expect(r).toMatchObject({ transactionId: 'GPA.5555..1', productId: 'storybook_sub_monthly_3', state: 'ACTIVE' });
    expect(r.periodEnd.toISOString()).toBe(expiry);
    expect(calls.some((c) => c.url.includes('/purchases/subscriptions/storybook_sub_monthly_3/tokens/tok:acknowledge'))).toBe(true);
    const expired = fake({ subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', lineItems: [{ productId: 'p', expiryTime: expiry }] });
    expect((await expired.provider.verifySubscription({ userId: 'u1', productId: null, purchaseToken: 't' })).state).toBe('EXPIRED');
  });

  it('다른 계정 영수증, 대기 중, 없는 영수증', async () => {
    await expect(fake({ purchaseState: 0, obfuscatedExternalAccountId: 'someone' }).provider.verify({ userId: 'me', orderId: null, productId: 'p', purchaseToken: 't' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
    expect((await fake({ purchaseState: 2, orderId: 'G' }).provider.verify({ userId: 'me', orderId: null, productId: 'p', purchaseToken: 't' })).state).toBe('PENDING');
    await expect(fake({}, 404).provider.verify({ userId: 'me', orderId: null, productId: 'p', purchaseToken: 't' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
    await expect(fake({}, 500).provider.verify({ userId: 'me', orderId: null, productId: 'p', purchaseToken: 't' })).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});

describe('애플 검증', () => {
  const env = { ...process.env };
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  beforeEach(() => {
    Object.assign(process.env, {
      APPLE_ISSUER_ID: 'iss',
      APPLE_KEY_ID: 'KEY123',
      APPLE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
      APPLE_BUNDLE_ID: 'com.jeongjihyun.donghwasup',
      APPLE_ENV: 'sandbox',
    });
  });
  afterAll(() => (process.env = env));

  const signed = (o: object) => `x.${Buffer.from(JSON.stringify(o)).toString('base64url')}.y`;
  function fake(tx: object, status = 200) {
    const calls: Call[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return json(status, { signedTransactionInfo: signed(tx) });
    }) as unknown as typeof fetch;
    return { provider: new AppleIAPProvider(f), calls };
  }

  it('번들·계정이 맞으면 통과, 금액은 원 단위로', async () => {
    const { provider, calls } = fake({ transactionId: '2000000123', productId: 'storybook_001', bundleId: 'com.jeongjihyun.donghwasup', appAccountToken: 'u1', price: 4900000 });
    const r = await provider.verify({ userId: 'u1', orderId: 'o', productId: null, purchaseToken: '2000000123' });
    expect(r).toMatchObject({ transactionId: '2000000123', productId: 'storybook_001', state: 'PURCHASED', amount: 4900 });
    expect(calls[0].url).toBe('https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/2000000123');
  });

  it('구독: 만료일이 있으면 기간을 돌려주고, 지났으면 만료', async () => {
    const base = { transactionId: '3000000001', productId: 'storybook_sub_monthly_3', bundleId: 'com.jeongjihyun.donghwasup', price: 6900000 };
    const now = Date.now();
    const ok = await fake({ ...base, purchaseDate: now, expiresDate: now + 30 * 86400_000 }).provider.verifySubscription({ userId: 'u', purchaseToken: '3000000001' });
    expect(ok).toMatchObject({ state: 'ACTIVE', amount: 6900, transactionId: '3000000001' });
    const old = await fake({ ...base, purchaseDate: now - 40 * 86400_000, expiresDate: now - 86400_000 }).provider.verifySubscription({ userId: 'u', purchaseToken: '3000000001' });
    expect(old.state).toBe('EXPIRED');
    await expect(fake(base).provider.verifySubscription({ userId: 'u', purchaseToken: '3000000001' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' }); // 만료일 없음 = 구독 아님
  });

  it('다른 앱·다른 계정·환불된 거래·이상한 거래번호', async () => {
    const base = { transactionId: '1', productId: 'p', bundleId: 'com.jeongjihyun.donghwasup' };
    await expect(fake({ ...base, bundleId: 'com.other' }).provider.verify({ userId: 'u', orderId: null, productId: null, purchaseToken: '1' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
    await expect(fake({ ...base, appAccountToken: 'x' }).provider.verify({ userId: 'u', orderId: null, productId: null, purchaseToken: '1' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
    expect((await fake({ ...base, revocationDate: 1 }).provider.verify({ userId: 'u', orderId: null, productId: null, purchaseToken: '1' })).state).toBe('CANCELED');
    await expect(fake(base).provider.verify({ userId: 'u', orderId: null, productId: null, purchaseToken: '../admin' })).rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
  });
});
