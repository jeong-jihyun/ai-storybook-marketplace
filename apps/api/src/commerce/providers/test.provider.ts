import { randomUUID } from 'node:crypto';
import { signToken, verifyToken } from '../../auth/crypto';
import { ProviderError, type PaymentProvider, type VerifiedPurchase, type VerifyInput } from './payment-provider';

/**
 * 테스트 결제 (돈이 나가지 않음).
 * 스토어 결제창 대신 서버가 서명한 "테스트 영수증"을 발급하고, 검증도 서명으로 한다.
 * 실제 스토어와 같은 흐름(영수증 → 서버 검증 → 권한 부여)을 그대로 시험하기 위함.
 * PAYMENT_TEST_MODE=false 로 끈다 (정식 출시 때).
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly name = 'TEST' as const;

  isEnabled() {
    return process.env.PAYMENT_TEST_MODE !== 'false';
  }

  issueReceipt(userId: string, orderId: string, productId: string, amount: number) {
    const transactionId = `TEST-${randomUUID()}`;
    return {
      transactionId,
      purchaseToken: signToken({ sub: userId, typ: 'test-receipt', orderId, productId, amount, tx: transactionId }, 60 * 60),
    };
  }

  async verify(input: VerifyInput): Promise<VerifiedPurchase> {
    const p = verifyToken(input.purchaseToken, 'test-receipt');
    if (!p || p.sub !== input.userId) throw new ProviderError('INVALID_RECEIPT', '영수증을 확인할 수 없어요.');
    return {
      transactionId: String(p.tx),
      productId: String(p.productId),
      state: 'PURCHASED',
      amount: Number(p.amount),
      orderId: String(p.orderId),
    };
  }
}
