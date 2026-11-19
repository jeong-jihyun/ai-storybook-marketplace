import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { MySubscription, PaymentProviderName, RedeemCreditResult, SubscriptionPlan, SubscriptionVerifyResult } from '@storybook/shared-types';
import { CATALOG_REPOSITORY, type CatalogRepository } from '../catalog/catalog.repository';
import { CLOCK, type Clock } from '../common/clock';
import { PAYMENT_PROVIDERS } from './commerce.service';
import { COMMERCE_STORE, type CommerceStore, type PlanRecord, type SubscriptionRecord } from './commerce.store';
import { ProviderError, type PaymentProvider, type VerifiedSubscription } from './providers/payment-provider';
import { TestPaymentProvider } from './providers/test.provider';

const DAY = 24 * 3600 * 1000;

/**
 * 구독(월 소장권)
 * - 결제(시작·갱신)마다 소장권이 요금제 권수로 다시 채워진다. 남은 소장권은 다음 기간으로 넘어가지 않는다.
 * - 소장권으로 받은 책은 내 서재에 영구 소장 (해지해도 남음).
 * - 해지는 "기간 끝에 해지" 예약 — 끝날 때까지는 소장권 사용 가능.
 * - 테스트 결제는 기간이 지나면 자동 갱신(해지 예약이면 만료). 실제 스토어는 영수증 재검증으로 갱신을 반영.
 */
@Injectable()
export class SubscriptionService {
  private readonly providers: Map<PaymentProviderName, PaymentProvider>;

  constructor(
    @Inject(COMMERCE_STORE) private readonly store: CommerceStore,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
    @Inject(PAYMENT_PROVIDERS) providers: PaymentProvider[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  private provider(name: PaymentProviderName) {
    const p = this.providers.get(name);
    if (!p || !p.isEnabled()) throw new ServiceUnavailableException({ code: 'PROVIDER_NOT_CONFIGURED', message: '지금은 이 결제 방식을 쓸 수 없어요.' });
    return p;
  }

  private toPlan(p: PlanRecord): SubscriptionPlan {
    return { code: p.code, name: p.name, description: p.description, price: p.price, periodDays: p.periodDays, creditsPerPeriod: p.creditsPerPeriod, storeProductId: p.storeProductId };
  }

  private async toMy(s: SubscriptionRecord): Promise<MySubscription> {
    const plan = (await this.store.findPlan({ id: s.planId }))!;
    return {
      id: s.id,
      plan: this.toPlan(plan),
      status: s.status,
      provider: s.provider as PaymentProviderName,
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      creditsRemaining: s.creditsRemaining,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    };
  }

  async plans(): Promise<SubscriptionPlan[]> {
    return (await this.store.listPlans()).map((p) => this.toPlan(p));
  }

  private async plan(code: string) {
    const p = await this.store.findPlan({ code });
    if (!p || !p.isActive) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: '없는 요금제예요.' });
    return p;
  }

  /**
   * 사용 중인 구독 (기간이 지났으면 먼저 정리).
   * 테스트 결제: 해지 예약이면 만료, 아니면 기간을 이어서 자동 갱신(실제 스토어의 자동 결제를 흉내).
   */
  async current(userId: string): Promise<SubscriptionRecord | null> {
    let s = await this.store.findActiveSubscription(userId);
    const now = this.clock.now();
    for (let guard = 0; s && s.currentPeriodEnd.getTime() <= now.getTime() && guard < 24; guard++) {
      if (s.cancelAtPeriodEnd || s.provider !== 'TEST') {
        await this.store.expire(s.id);
        return null;
      }
      const plan = (await this.store.findPlan({ id: s.planId }))!;
      const start = s.currentPeriodEnd;
      const end = new Date(start.getTime() + plan.periodDays * DAY);
      const r = await this.store.applyCharge({
        userId,
        plan,
        provider: 'TEST',
        transactionId: `TEST-RENEW-${s.id}-${start.toISOString()}`,
        amount: plan.price,
        periodStart: start,
        periodEnd: end,
      });
      s = 'subscription' in r ? r.subscription : null;
    }
    return s;
  }

  async mine(userId: string): Promise<MySubscription | null> {
    const s = await this.current(userId);
    return s ? this.toMy(s) : null;
  }

  /** 테스트 결제창 (돈이 나가지 않음) */
  async testCheckout(userId: string, planCode: string, outcome: 'success' | 'cancel' | 'fail') {
    const test = this.provider('TEST') as TestPaymentProvider;
    const plan = await this.plan(planCode);
    const active = await this.current(userId);
    if (active) throw new ConflictException({ code: 'ALREADY_SUBSCRIBED', message: '이미 구독 중이에요.' });
    if (outcome !== 'success') return { outcome };
    const now = this.clock.now();
    const r = test.issueSubscriptionReceipt(userId, plan.storeProductId ?? plan.code, plan.price, now, new Date(now.getTime() + plan.periodDays * DAY));
    return { outcome, productId: plan.storeProductId ?? plan.code, purchaseToken: r.purchaseToken };
  }

  /** 구독 영수증 검증 → 구독 시작·갱신 (같은 영수증은 한 번만 반영) */
  async verify(userId: string, input: { provider: PaymentProviderName; productId?: string; purchaseToken: string }): Promise<SubscriptionVerifyResult> {
    const provider = this.provider(input.provider);
    let v: VerifiedSubscription;
    try {
      v = await provider.verifySubscription({ userId, productId: input.productId ?? null, purchaseToken: input.purchaseToken });
    } catch (e) {
      if (e instanceof ProviderError) {
        if (e.code === 'INVALID_RECEIPT') throw new BadRequestException({ code: 'INVALID_RECEIPT', message: e.message });
        throw new ServiceUnavailableException({ code: e.code, message: e.message });
      }
      throw e;
    }
    if (v.state === 'PENDING') throw new ConflictException({ code: 'PAYMENT_PENDING', message: '결제가 아직 끝나지 않았어요.' });
    if (v.state === 'EXPIRED' || v.periodEnd.getTime() <= this.clock.now().getTime()) {
      throw new ConflictException({ code: 'SUBSCRIPTION_EXPIRED', message: '이미 끝난 구독 영수증이에요.' });
    }
    const plan = (await this.store.findPlan({ productId: v.productId })) ?? (await this.store.findPlan({ code: v.productId }));
    if (!plan) throw new BadRequestException({ code: 'PRODUCT_MISMATCH', message: '우리 구독 상품의 영수증이 아니에요.' });
    if (v.amount !== null && v.amount !== plan.price) throw new BadRequestException({ code: 'AMOUNT_MISMATCH', message: '결제 금액이 요금제 가격과 달라요.' });

    const r = await this.store.applyCharge({ userId, plan, provider: provider.name, transactionId: v.transactionId, amount: v.amount ?? plan.price, periodStart: v.periodStart, periodEnd: v.periodEnd });
    if (r.kind === 'TX_USED') throw new ConflictException({ code: 'DUPLICATE_TRANSACTION', message: '이미 사용된 결제 영수증이에요.' });
    if (r.kind === 'ALREADY_SUBSCRIBED') throw new ConflictException({ code: 'ALREADY_SUBSCRIBED', message: '이미 구독 중이에요.' });
    return { success: true, result: r.kind, subscription: await this.toMy(r.subscription) };
  }

  private async mustHave(userId: string) {
    const s = await this.current(userId);
    if (!s) throw new NotFoundException({ code: 'NO_SUBSCRIPTION', message: '구독 중이 아니에요.' });
    return s;
  }

  /** 해지 예약 (기간 끝까지는 사용 가능) — 실제 스토어 구독은 스토어 앱에서 해지해야 결제가 멈춘다 */
  async cancel(userId: string) {
    const s = await this.mustHave(userId);
    return this.toMy((await this.store.setCancelAtPeriodEnd(s.id, true))!);
  }

  async resume(userId: string) {
    const s = await this.mustHave(userId);
    return this.toMy((await this.store.setCancelAtPeriodEnd(s.id, false))!);
  }

  /** 소장권 1장으로 책 받기 */
  async redeem(userId: string, bookId: string): Promise<RedeemCreditResult> {
    const book = await this.catalog.findBookById(bookId);
    if (!book || book.status !== 'PUBLISHED') throw new NotFoundException({ code: 'BOOK_NOT_FOUND', message: '판매 중인 책이 아니에요.' });
    const s = await this.current(userId);
    if (!s) throw new ForbiddenException({ code: 'NO_SUBSCRIPTION', message: '구독하면 소장권으로 받을 수 있어요.' });
    const r = await this.store.redeemCredit(userId, s.id, bookId, this.clock.now());
    if (r === 'ALREADY_OWNED') throw new ConflictException({ code: 'ALREADY_OWNED', message: '이미 내 서재에 있는 책이에요.' });
    if (r === 'NO_CREDIT') {
      const next = s.currentPeriodEnd;
      throw new ConflictException({ code: 'NO_CREDIT', message: `이번 달 소장권을 다 썼어요. ${next.getMonth() + 1}월 ${next.getDate()}일에 새로 채워져요.` });
    }
    if (r === 'NOT_ACTIVE') throw new ForbiddenException({ code: 'NO_SUBSCRIPTION', message: '구독이 끝났어요.' });
    const after = (await this.store.findActiveSubscription(userId))!;
    return { bookId, creditsRemaining: after.creditsRemaining };
  }
}
