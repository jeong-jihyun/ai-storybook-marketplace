import { createSign } from 'node:crypto';
import { ProviderError, type PaymentProvider, type VerifiedPurchase, type VerifiedSubscription, type VerifyInput } from './payment-provider';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * 구글 플레이 인앱 결제 검증 (Google Play Developer API v3, purchases.products).
 * 필요한 환경변수: GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (서비스 계정 키 JSON)
 * 전자책은 한 번 사면 계속 보는 "소모되지 않는 상품"이라 검증 후 acknowledge 만 한다.
 */
export class GooglePlayBillingProvider implements PaymentProvider {
  readonly name = 'GOOGLE_PLAY' as const;
  private cachedToken: { value: string; exp: number } | null = null;

  constructor(private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}

  private account(): ServiceAccount | null {
    try {
      const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
      return raw ? (JSON.parse(raw) as ServiceAccount) : null;
    } catch {
      return null;
    }
  }

  isEnabled() {
    return !!process.env.GOOGLE_PLAY_PACKAGE_NAME && !!this.account();
  }

  /** 서비스 계정으로 OAuth 접근 토큰 받기 (JWT bearer, RS256) */
  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.exp > Date.now() + 60_000) return this.cachedToken.value;
    const sa = this.account();
    if (!sa) throw new ProviderError('NOT_CONFIGURED', '구글 플레이 결제가 아직 설정되지 않았어요.');
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
    const res = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    });
    if (!res.ok) throw new ProviderError('PROVIDER_UNAVAILABLE', '구글 결제 서버에 연결하지 못했어요.');
    const j = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    return j.access_token;
  }

  async verify(input: VerifyInput): Promise<VerifiedPurchase> {
    if (!this.isEnabled()) throw new ProviderError('NOT_CONFIGURED', '구글 플레이 결제가 아직 설정되지 않았어요.');
    if (!input.productId) throw new ProviderError('INVALID_RECEIPT', '상품 정보가 없어요.');
    const pkg = encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME!);
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${encodeURIComponent(input.productId)}/tokens/${encodeURIComponent(input.purchaseToken)}`;
    const token = await this.accessToken();
    const res = await this.fetchImpl(base, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 400 || res.status === 404 || res.status === 410) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    if (!res.ok) throw new ProviderError('PROVIDER_UNAVAILABLE', '구글 결제 서버에 연결하지 못했어요.');
    const p = (await res.json()) as {
      purchaseState?: number; // 0 구매됨, 1 취소, 2 대기
      acknowledgementState?: number;
      orderId?: string;
      obfuscatedExternalAccountId?: string;
    };
    // 앱이 결제할 때 넣은 계정 ID(우리 사용자 ID)와 다르면 남의 영수증
    if (p.obfuscatedExternalAccountId && p.obfuscatedExternalAccountId !== input.userId) {
      throw new ProviderError('INVALID_RECEIPT', '다른 계정의 영수증이에요.');
    }
    const state = p.purchaseState === 0 ? 'PURCHASED' : p.purchaseState === 2 ? 'PENDING' : 'CANCELED';
    if (state === 'PURCHASED' && p.acknowledgementState === 0) {
      // 3일 안에 확인하지 않으면 구글이 자동 환불하므로 검증 직후 확인 처리
      await this.fetchImpl(`${base}:acknowledge`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
    }
    return { transactionId: p.orderId ?? input.purchaseToken, productId: input.productId, state, amount: null, orderId: null };
  }

  /** 구독 검증 (purchases.subscriptionsv2) — 상태·만료일을 스토어에서 확인하고 미확인이면 확인 처리 */
  async verifySubscription(input: { userId: string; productId: string | null; purchaseToken: string }): Promise<VerifiedSubscription> {
    if (!this.isEnabled()) throw new ProviderError('NOT_CONFIGURED', '구글 플레이 결제가 아직 설정되지 않았어요.');
    const pkg = encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME!);
    const token = await this.accessToken();
    const res = await this.fetchImpl(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptionsv2/tokens/${encodeURIComponent(input.purchaseToken)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 400 || res.status === 404 || res.status === 410) throw new ProviderError('INVALID_RECEIPT', '구독 영수증을 확인할 수 없어요.');
    if (!res.ok) throw new ProviderError('PROVIDER_UNAVAILABLE', '구글 결제 서버에 연결하지 못했어요.');
    const s = (await res.json()) as {
      subscriptionState?: string;
      startTime?: string;
      latestOrderId?: string;
      acknowledgementState?: string;
      lineItems?: { productId: string; expiryTime: string }[];
      externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
    };
    const acct = s.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (acct && acct !== input.userId) throw new ProviderError('INVALID_RECEIPT', '다른 계정의 영수증이에요.');
    const item = s.lineItems?.[0];
    if (!item) throw new ProviderError('INVALID_RECEIPT', '구독 영수증을 확인할 수 없어요.');
    const state = s.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' || s.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
      ? 'ACTIVE'
      : s.subscriptionState === 'SUBSCRIPTION_STATE_PENDING' ? 'PENDING' : 'EXPIRED';
    if (state === 'ACTIVE' && s.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
      await this.fetchImpl(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptions/${encodeURIComponent(item.productId)}/tokens/${encodeURIComponent(input.purchaseToken)}:acknowledge`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' },
      );
    }
    const end = new Date(item.expiryTime);
    // 갱신마다 주문번호 끝이 ..0, ..1 처럼 바뀌므로 거래번호로 쓰기 좋다
    return {
      transactionId: s.latestOrderId ?? `${input.purchaseToken}:${item.expiryTime}`,
      productId: item.productId,
      state,
      periodStart: new Date(end.getTime() - 30 * 24 * 3600 * 1000),
      periodEnd: end,
      amount: null,
    };
  }
}
