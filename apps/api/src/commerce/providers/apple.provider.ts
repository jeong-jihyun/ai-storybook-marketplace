import { createSign } from 'node:crypto';
import { ProviderError, type PaymentProvider, type VerifiedPurchase, type VerifiedSubscription, type VerifyInput } from './payment-provider';

/**
 * 애플 인앱 결제 검증 (App Store Server API — Get Transaction Info).
 * 필요한 환경변수: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY(.p8 내용), APPLE_BUNDLE_ID, APPLE_ENV(sandbox|production)
 * 앱은 purchaseToken 자리에 transactionId 를 보낸다.
 * 응답은 우리 키로 인증한 TLS 요청에 대한 애플 서버 응답이므로 내용을 신뢰하고, 번들·상품·계정·환불 여부를 확인한다.
 */
export class AppleIAPProvider implements PaymentProvider {
  readonly name = 'APPLE' as const;

  constructor(private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}

  isEnabled() {
    return !!(process.env.APPLE_ISSUER_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY && process.env.APPLE_BUNDLE_ID);
  }

  private bearer(): string {
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${enc({ alg: 'ES256', kid: process.env.APPLE_KEY_ID, typ: 'JWT' })}.${enc({
      iss: process.env.APPLE_ISSUER_ID,
      iat: now,
      exp: now + 15 * 60,
      aud: 'appstoreconnect-v1',
      bid: process.env.APPLE_BUNDLE_ID,
    })}`;
    const key = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const sig = createSign('SHA256').update(unsigned).sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    return `${unsigned}.${sig}`;
  }

  private async transaction(userId: string, transactionId: string) {
    if (!this.isEnabled()) throw new ProviderError('NOT_CONFIGURED', '애플 결제가 아직 설정되지 않았어요.');
    if (!/^\d{1,30}$/.test(transactionId)) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    const host = process.env.APPLE_ENV === 'production' ? 'https://api.storekit.itunes.apple.com' : 'https://api.storekit-sandbox.itunes.apple.com';
    const res = await this.fetchImpl(`${host}/inApps/v1/transactions/${transactionId}`, { headers: { Authorization: `Bearer ${this.bearer()}` } });
    if (res.status === 400 || res.status === 404) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    if (!res.ok) throw new ProviderError('PROVIDER_UNAVAILABLE', '애플 결제 서버에 연결하지 못했어요.');
    const { signedTransactionInfo } = (await res.json()) as { signedTransactionInfo: string };
    const t = JSON.parse(Buffer.from(signedTransactionInfo.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      transactionId: string;
      productId: string;
      bundleId: string;
      appAccountToken?: string;
      revocationDate?: number;
      purchaseDate?: number;
      expiresDate?: number;
      price?: number;
    };
    if (t.bundleId !== process.env.APPLE_BUNDLE_ID) throw new ProviderError('INVALID_RECEIPT', '이 앱의 영수증이 아니에요.');
    if (t.appAccountToken && t.appAccountToken !== userId) throw new ProviderError('INVALID_RECEIPT', '다른 계정의 영수증이에요.');
    return t;
  }

  async verifySubscription(input: { userId: string; purchaseToken: string }): Promise<VerifiedSubscription> {
    const t = await this.transaction(input.userId, input.purchaseToken);
    if (!t.expiresDate) throw new ProviderError('INVALID_RECEIPT', '구독 영수증이 아니에요.');
    return {
      transactionId: t.transactionId,
      productId: t.productId,
      state: t.revocationDate || t.expiresDate < Date.now() ? 'EXPIRED' : 'ACTIVE',
      periodStart: new Date(t.purchaseDate ?? t.expiresDate - 30 * 24 * 3600 * 1000),
      periodEnd: new Date(t.expiresDate),
      amount: typeof t.price === 'number' ? Math.round(t.price / 1000) : null,
    };
  }

  async verify(input: VerifyInput): Promise<VerifiedPurchase> {
    if (!this.isEnabled()) throw new ProviderError('NOT_CONFIGURED', '애플 결제가 아직 설정되지 않았어요.');
    if (!/^\d{1,30}$/.test(input.purchaseToken)) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    const host = process.env.APPLE_ENV === 'production' ? 'https://api.storekit.itunes.apple.com' : 'https://api.storekit-sandbox.itunes.apple.com';
    const res = await this.fetchImpl(`${host}/inApps/v1/transactions/${input.purchaseToken}`, { headers: { Authorization: `Bearer ${this.bearer()}` } });
    if (res.status === 400 || res.status === 404) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    if (!res.ok) throw new ProviderError('PROVIDER_UNAVAILABLE', '애플 결제 서버에 연결하지 못했어요.');
    const { signedTransactionInfo } = (await res.json()) as { signedTransactionInfo: string };
    const t = JSON.parse(Buffer.from(signedTransactionInfo.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      transactionId: string;
      productId: string;
      bundleId: string;
      appAccountToken?: string;
      revocationDate?: number;
      price?: number; // 1000 단위 (예: 4900원 → 4900000)
    };
    if (t.bundleId !== process.env.APPLE_BUNDLE_ID) throw new ProviderError('INVALID_RECEIPT', '이 앱의 영수증이 아니에요.');
    if (t.appAccountToken && t.appAccountToken !== input.userId) throw new ProviderError('INVALID_RECEIPT', '다른 계정의 영수증이에요.');
    return {
      transactionId: t.transactionId,
      productId: t.productId,
      state: t.revocationDate ? 'CANCELED' : 'PURCHASED',
      amount: typeof t.price === 'number' ? Math.round(t.price / 1000) : null,
      orderId: null,
    };
  }
}
