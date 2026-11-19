import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ChargeResult,
  CommerceStore,
  NewUser,
  OrderRecord,
  PaymentInput,
  PaymentResult,
  PlanRecord,
  RedeemResult,
  SubscriptionChargeInput,
  SubscriptionRecord,
  UserPatch,
  UserRecord,
} from './commerce.store';

/** DB 없이 메모리에 저장 (서버를 다시 켜면 사라짐 — 로컬 확인·테스트용) */
@Injectable()
export class MemoryCommerceStore implements CommerceStore {
  private users = new Map<string, UserRecord>();
  private orders = new Map<string, OrderRecord>();
  private txIndex = new Map<string, string>(); // provider:tx → orderId
  private library = new Map<string, Map<string, Date>>(); // userId → bookId → purchasedAt
  private sources = new Map<string, 'PURCHASE' | 'SUBSCRIPTION'>(); // userId:bookId → 출처
  private plans: PlanRecord[] = [
    {
      id: randomUUID(),
      code: 'monthly_3',
      name: '소장권 구독',
      description: '매달 동화 3권을 골라 내 서재에 평생 소장해요.',
      price: 6900,
      periodDays: 30,
      creditsPerPeriod: 3,
      storeProductId: 'storybook_sub_monthly_3',
      isActive: true,
    },
  ];
  private subs = new Map<string, SubscriptionRecord>();
  private charges = new Map<string, string>(); // provider:tx → subscriptionId

  async createUser(u: NewUser) {
    const email = u.email.toLowerCase();
    if ([...this.users.values()].some((x) => x.email === email)) return null;
    const rec: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: u.passwordHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      nickname: u.nickname,
      tokenVersion: 0,
      parentPinHash: u.parentPinHash,
      pinFailCount: 0,
      pinLockedUntil: null,
      parentConsentAt: u.parentConsentAt,
      createdAt: new Date(),
    };
    this.users.set(rec.id, rec);
    return { ...rec };
  }

  async findUserByEmail(email: string) {
    const u = [...this.users.values()].find((x) => x.email === email.toLowerCase());
    return u ? { ...u } : null;
  }

  async findUserById(id: string) {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async updateUser(id: string, patch: UserPatch) {
    const u = this.users.get(id);
    if (!u) return null;
    const { withdrawnAt: _w, ...rest } = patch;
    Object.assign(u, rest);
    return { ...u };
  }

  async createOrder(userId: string, idempotencyKey: string, items: { bookId: string; unitPrice: number }[]) {
    const existing = [...this.orders.values()].find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey);
    if (existing) return { order: structuredClone(existing), created: false };
    const order: OrderRecord = {
      id: randomUUID(),
      userId,
      totalAmount: items.reduce((s, i) => s + i.unitPrice, 0),
      status: 'PENDING',
      idempotencyKey,
      createdAt: new Date(),
      paidAt: null,
      items,
      payment: null,
    };
    this.orders.set(order.id, order);
    return { order: structuredClone(order), created: true };
  }

  async findOrder(id: string) {
    const o = this.orders.get(id);
    return o ? structuredClone(o) : null;
  }

  async listOrders(userId: string, limit: number) {
    return [...this.orders.values()]
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((o) => structuredClone(o));
  }

  async markOrder(id: string, status: 'FAILED' | 'CANCELED') {
    const o = this.orders.get(id);
    if (!o) return null;
    if (o.status === 'PENDING') o.status = status;
    return structuredClone(o);
  }

  async completePayment(p: PaymentInput): Promise<PaymentResult> {
    const order = this.orders.get(p.orderId)!;
    const key = `${p.provider}:${p.transactionId}`;
    const usedBy = this.txIndex.get(key);
    if (usedBy && usedBy !== p.orderId) return { kind: 'TX_USED', order: structuredClone(order) };
    if (usedBy === p.orderId) return { kind: 'ALREADY_PAID', order: structuredClone(order) };
    if (order.status !== 'PENDING') return { kind: 'ORDER_CLOSED', order: structuredClone(order) };
    const now = new Date();
    this.txIndex.set(key, order.id);
    order.status = 'PAID';
    order.paidAt = now;
    order.payment = { provider: p.provider, transactionId: p.transactionId, verifiedAt: now };
    const lib = this.library.get(p.userId) ?? new Map<string, Date>();
    for (const it of order.items) if (!lib.has(it.bookId)) lib.set(it.bookId, now);
    this.library.set(p.userId, lib);
    return { kind: 'PAID', order: structuredClone(order) };
  }

  async listLibrary(userId: string) {
    return [...(this.library.get(userId) ?? new Map<string, Date>()).entries()]
      .map(([bookId, purchasedAt]) => ({ bookId, purchasedAt }))
      .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
  }

  async ownsBook(userId: string, bookId: string) {
    return this.library.get(userId)?.has(bookId) ?? false;
  }

  // ───── 구독
  async listPlans() {
    return this.plans.filter((p) => p.isActive).map((p) => ({ ...p }));
  }

  async findPlan(by: { id?: string; code?: string; productId?: string }) {
    const p = this.plans.find((x) => (by.id && x.id === by.id) || (by.code && x.code === by.code) || (by.productId && x.storeProductId === by.productId));
    return p ? { ...p } : null;
  }

  async findActiveSubscription(userId: string) {
    const s = [...this.subs.values()].find((x) => x.userId === userId && x.status === 'ACTIVE');
    return s ? { ...s } : null;
  }

  async applyCharge(c: SubscriptionChargeInput): Promise<ChargeResult> {
    const key = `${c.provider}:${c.transactionId}`;
    const usedBy = this.charges.get(key);
    if (usedBy) {
      const s = this.subs.get(usedBy)!;
      return s.userId === c.userId ? { kind: 'ALREADY_APPLIED', subscription: { ...s } } : { kind: 'TX_USED' };
    }
    const active = [...this.subs.values()].find((x) => x.userId === c.userId && x.status === 'ACTIVE');
    if (active) {
      if (c.periodEnd.getTime() <= active.currentPeriodEnd.getTime()) return { kind: 'ALREADY_SUBSCRIBED', subscription: { ...active } };
      Object.assign(active, {
        planId: c.plan.id,
        provider: c.provider,
        currentPeriodStart: c.periodStart,
        currentPeriodEnd: c.periodEnd,
        creditsRemaining: c.plan.creditsPerPeriod,
        cancelAtPeriodEnd: false,
      });
      this.charges.set(key, active.id);
      return { kind: 'RENEWED', subscription: { ...active } };
    }
    const sub: SubscriptionRecord = {
      id: randomUUID(),
      userId: c.userId,
      planId: c.plan.id,
      status: 'ACTIVE',
      provider: c.provider,
      currentPeriodStart: c.periodStart,
      currentPeriodEnd: c.periodEnd,
      creditsRemaining: c.plan.creditsPerPeriod,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
    };
    this.subs.set(sub.id, sub);
    this.charges.set(key, sub.id);
    return { kind: 'STARTED', subscription: { ...sub } };
  }

  async setCancelAtPeriodEnd(subscriptionId: string, value: boolean) {
    const s = this.subs.get(subscriptionId);
    if (!s || s.status !== 'ACTIVE') return null;
    s.cancelAtPeriodEnd = value;
    return { ...s };
  }

  async expire(subscriptionId: string) {
    const s = this.subs.get(subscriptionId);
    if (s) s.status = 'EXPIRED';
  }

  async redeemCredit(userId: string, subscriptionId: string, bookId: string, now: Date): Promise<RedeemResult> {
    const s = this.subs.get(subscriptionId);
    if (!s || s.userId !== userId || s.status !== 'ACTIVE' || s.currentPeriodEnd.getTime() <= now.getTime()) return 'NOT_ACTIVE';
    const lib = this.library.get(userId) ?? new Map<string, Date>();
    if (lib.has(bookId)) return 'ALREADY_OWNED';
    if (s.creditsRemaining <= 0) return 'NO_CREDIT';
    s.creditsRemaining -= 1;
    lib.set(bookId, now);
    this.library.set(userId, lib);
    this.sources.set(`${userId}:${bookId}`, 'SUBSCRIPTION');
    return 'OK';
  }

  async librarySources(userId: string) {
    const out: Record<string, 'PURCHASE' | 'SUBSCRIPTION'> = {};
    for (const bookId of this.library.get(userId)?.keys() ?? []) out[bookId] = this.sources.get(`${userId}:${bookId}`) ?? 'PURCHASE';
    return out;
  }
}
