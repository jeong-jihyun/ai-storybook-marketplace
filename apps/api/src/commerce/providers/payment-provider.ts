// 결제 공급자 공통 인터페이스 (설계서 4.3 PaymentModule)
export type ProviderName = 'TEST' | 'GOOGLE_PLAY' | 'APPLE';
export const PROVIDERS: ProviderName[] = ['TEST', 'GOOGLE_PLAY', 'APPLE'];

export interface VerifyInput {
  userId: string;
  orderId: string | null; // 구매 복구 때는 null
  productId: string | null;
  purchaseToken: string;
}

export interface VerifiedPurchase {
  transactionId: string; // 공급자 거래번호 (중복 결제 판별 기준)
  productId: string;
  state: 'PURCHASED' | 'PENDING' | 'CANCELED';
  amount: number | null; // 공급자가 금액을 알려 주면 (원)
  orderId: string | null; // 거래에 묶인 우리 주문 (TEST 영수증만 알 수 있음)
}

export class ProviderError extends Error {
  constructor(public code: 'INVALID_RECEIPT' | 'NOT_CONFIGURED' | 'PROVIDER_UNAVAILABLE', message: string) {
    super(message);
  }
}

export interface PaymentProvider {
  readonly name: ProviderName;
  /** 운영 키가 설정되어 사용할 수 있는지 */
  isEnabled(): boolean;
  /** 스토어 서버에 직접 물어 영수증을 검증한다 (앱이 보낸 값은 믿지 않음) */
  verify(input: VerifyInput): Promise<VerifiedPurchase>;
}
