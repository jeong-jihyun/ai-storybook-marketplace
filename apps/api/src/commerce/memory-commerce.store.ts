import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CommerceStore, NewUser, OrderRecord, PaymentInput, PaymentResult, UserPatch, UserRecord } from './commerce.store';

/** DB 없이 메모리에 저장 (서버를 다시 켜면 사라짐 — 로컬 확인·테스트용) */
@Injectable()
export class MemoryCommerceStore implements CommerceStore {
  private users = new Map<string, UserRecord>();
  private orders = new Map<string, OrderRecord>();
  private txIndex = new Map<string, string>(); // provider:tx → orderId
  private library = new Map<string, Map<string, Date>>(); // userId → bookId → purchasedAt

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
}
