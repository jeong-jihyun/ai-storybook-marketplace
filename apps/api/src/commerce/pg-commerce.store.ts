import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type {
  ChargeResult,
  CommerceStore,
  NewUser,
  OrderRecord,
  OrderStatus,
  PaymentInput,
  PaymentResult,
  PlanRecord,
  RedeemResult,
  SubscriptionChargeInput,
  SubscriptionRecord,
  UserPatch,
  UserRecord,
  UserStatus,
} from './commerce.store';

type Row = Record<string, unknown>;

const toUser = (r: Row): UserRecord => ({
  id: r.id as string,
  email: r.email as string,
  passwordHash: (r.password_hash as string) ?? null,
  role: r.role as string,
  status: r.status as UserStatus,
  nickname: (r.nickname as string) ?? null,
  tokenVersion: Number(r.token_version),
  parentPinHash: (r.parent_pin_hash as string) ?? null,
  pinFailCount: Number(r.pin_fail_count),
  pinLockedUntil: (r.pin_locked_until as Date) ?? null,
  parentConsentAt: (r.parent_consent_at as Date) ?? null,
  createdAt: r.created_at as Date,
});

const toPlan = (r: Row): PlanRecord => ({
  id: r.id as string,
  code: r.code as string,
  name: r.name as string,
  description: (r.description as string) ?? '',
  price: Number(r.price),
  periodDays: Number(r.period_days),
  creditsPerPeriod: Number(r.credits_per_period),
  storeProductId: (r.store_product_id as string) ?? null,
  isActive: !!r.is_active,
});

const toSub = (r: Row): SubscriptionRecord => ({
  id: r.id as string,
  userId: r.user_id as string,
  planId: r.plan_id as string,
  status: r.status as 'ACTIVE' | 'EXPIRED',
  provider: r.provider as string,
  currentPeriodStart: r.current_period_start as Date,
  currentPeriodEnd: r.current_period_end as Date,
  creditsRemaining: Number(r.credits_remaining),
  cancelAtPeriodEnd: !!r.cancel_at_period_end,
  createdAt: r.created_at as Date,
});

// TypeORM 의 postgres UPDATE ... RETURNING 결과는 [rows, count] 형태
const returned = (rows: unknown): Row[] => (Array.isArray(rows) && Array.isArray(rows[0]) ? (rows[0] as Row[]) : (rows as Row[]));

// UserPatch 필드 → 컬럼 (화이트리스트: 이 목록에 없는 키는 SQL 에 들어가지 않는다)
const USER_COLUMNS: Record<keyof UserPatch, string> = {
  email: 'email',
  passwordHash: 'password_hash',
  nickname: 'nickname',
  parentPinHash: 'parent_pin_hash',
  pinFailCount: 'pin_fail_count',
  pinLockedUntil: 'pin_locked_until',
  tokenVersion: 'token_version',
  status: 'status',
  withdrawnAt: 'withdrawn_at',
};

/** PostgreSQL 저장소 (Supabase 포함) */
@Injectable()
export class PgCommerceStore implements CommerceStore {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async createUser(u: NewUser) {
    const rows: Row[] = await this.ds.query(
      `INSERT INTO users (email, password_hash, nickname, parent_pin_hash, parent_consent_at)
       VALUES (lower($1), $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [u.email, u.passwordHash, u.nickname, u.parentPinHash, u.parentConsentAt],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findUserByEmail(email: string) {
    const rows: Row[] = await this.ds.query(`SELECT * FROM users WHERE email = lower($1)`, [email]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findUserById(id: string) {
    const rows: Row[] = await this.ds.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async updateUser(id: string, patch: UserPatch) {
    const entries = Object.entries(patch).filter(([k, v]) => v !== undefined && k in USER_COLUMNS) as [keyof UserPatch, unknown][];
    if (!entries.length) return this.findUserById(id);
    const sets = entries.map(([k], i) => `${USER_COLUMNS[k]} = $${i + 2}`).join(', ');
    const list = returned(await this.ds.query(`UPDATE users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...entries.map(([, v]) => v)]));
    return list[0] ? toUser(list[0]) : null;
  }

  private async loadOrders(m: EntityManager | DataSource, where: string, params: unknown[], limit = 1000): Promise<OrderRecord[]> {
    const orders: Row[] = await m.query(
      `SELECT o.*, p.provider, p.transaction_id, p.verified_at
         FROM orders o
         LEFT JOIN LATERAL (SELECT provider, transaction_id, verified_at FROM payments
                             WHERE order_id = o.id AND status = 'PAID' ORDER BY verified_at DESC LIMIT 1) p ON TRUE
        WHERE ${where} ORDER BY o.created_at DESC LIMIT ${Number(limit)}`,
      params,
    );
    if (!orders.length) return [];
    const items: Row[] = await m.query(`SELECT order_id, book_id, unit_price FROM order_items WHERE order_id = ANY($1::uuid[])`, [orders.map((o) => o.id)]);
    return orders.map((o) => ({
      id: o.id as string,
      userId: o.user_id as string,
      totalAmount: Number(o.total_amount),
      status: o.status as OrderStatus,
      idempotencyKey: (o.idempotency_key as string) ?? null,
      createdAt: o.created_at as Date,
      paidAt: (o.paid_at as Date) ?? null,
      items: items.filter((i) => i.order_id === o.id).map((i) => ({ bookId: i.book_id as string, unitPrice: Number(i.unit_price) })),
      payment: o.provider ? { provider: o.provider as string, transactionId: o.transaction_id as string, verifiedAt: o.verified_at as Date } : null,
    }));
  }

  async createOrder(userId: string, idempotencyKey: string, items: { bookId: string; unitPrice: number }[]) {
    return this.ds.transaction(async (m) => {
      const total = items.reduce((s, i) => s + i.unitPrice, 0);
      const inserted: Row[] = await m.query(
        `INSERT INTO orders (user_id, total_amount, idempotency_key) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id`,
        [userId, total, idempotencyKey],
      );
      if (!inserted.length) {
        const [existing] = await this.loadOrders(m, `o.user_id = $1 AND o.idempotency_key = $2`, [userId, idempotencyKey]);
        return { order: existing, created: false };
      }
      const orderId = inserted[0].id as string;
      for (const it of items) {
        await m.query(`INSERT INTO order_items (order_id, book_id, unit_price) VALUES ($1, $2, $3)`, [orderId, it.bookId, it.unitPrice]);
      }
      const [order] = await this.loadOrders(m, `o.id = $1`, [orderId]);
      return { order, created: true };
    });
  }

  async findOrder(id: string) {
    const [o] = await this.loadOrders(this.ds, `o.id = $1`, [id]);
    return o ?? null;
  }

  async listOrders(userId: string, limit: number) {
    return this.loadOrders(this.ds, `o.user_id = $1`, [userId], limit);
  }

  async markOrder(id: string, status: 'FAILED' | 'CANCELED') {
    await this.ds.query(`UPDATE orders SET status = $2 WHERE id = $1 AND status = 'PENDING'`, [id, status]);
    return this.findOrder(id);
  }

  async completePayment(p: PaymentInput): Promise<PaymentResult> {
    return this.ds.transaction(async (m) => {
      // 같은 주문을 동시에 처리하지 않도록 주문 행을 잠근다
      await m.query(`SELECT id FROM orders WHERE id = $1 FOR UPDATE`, [p.orderId]);
      const used: Row[] = await m.query(`SELECT order_id FROM payments WHERE provider = $1 AND transaction_id = $2`, [p.provider, p.transactionId]);
      const load = async () => (await this.loadOrders(m, `o.id = $1`, [p.orderId]))[0];
      if (used.length) return { kind: used[0].order_id === p.orderId ? 'ALREADY_PAID' : 'TX_USED', order: await load() } as PaymentResult;
      const current = await load();
      if (current.status !== 'PENDING') return { kind: 'ORDER_CLOSED', order: current };

      await m.query(
        `INSERT INTO payments (order_id, user_id, provider, transaction_id, product_id, amount, status, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'PAID', NOW())`,
        [p.orderId, p.userId, p.provider, p.transactionId, p.productId, p.amount],
      );
      await m.query(`UPDATE orders SET status = 'PAID', paid_at = NOW() WHERE id = $1`, [p.orderId]);
      await m.query(
        `INSERT INTO library (user_id, book_id)
         SELECT $1, book_id FROM order_items WHERE order_id = $2
         ON CONFLICT (user_id, book_id) DO NOTHING`,
        [p.userId, p.orderId],
      );
      await m.query(`UPDATE books SET sales_count = sales_count + 1 WHERE id IN (SELECT book_id FROM order_items WHERE order_id = $1)`, [p.orderId]);
      return { kind: 'PAID', order: await load() };
    });
  }

  async listLibrary(userId: string) {
    const rows: Row[] = await this.ds.query(`SELECT book_id, purchased_at FROM library WHERE user_id = $1 ORDER BY purchased_at DESC`, [userId]);
    return rows.map((r) => ({ bookId: r.book_id as string, purchasedAt: r.purchased_at as Date }));
  }

  async ownsBook(userId: string, bookId: string) {
    const rows: Row[] = await this.ds.query(`SELECT 1 FROM library WHERE user_id = $1 AND book_id = $2`, [userId, bookId]);
    return rows.length > 0;
  }

  // ───── 구독
  async listPlans() {
    const rows: Row[] = await this.ds.query(`SELECT * FROM subscription_plans WHERE is_active ORDER BY sort_order, price`);
    return rows.map(toPlan);
  }

  async findPlan(by: { id?: string; code?: string; productId?: string }) {
    const [col, val] = by.id ? ['id', by.id] : by.code ? ['code', by.code] : ['store_product_id', by.productId];
    if (!val) return null;
    const rows: Row[] = await this.ds.query(`SELECT * FROM subscription_plans WHERE ${col} = $1`, [val]);
    return rows[0] ? toPlan(rows[0]) : null;
  }

  async findActiveSubscription(userId: string) {
    const rows: Row[] = await this.ds.query(`SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'ACTIVE'`, [userId]);
    return rows[0] ? toSub(rows[0]) : null;
  }

  async applyCharge(c: SubscriptionChargeInput): Promise<ChargeResult> {
    return this.ds.transaction(async (m) => {
      // 같은 사람의 구독 처리를 한 줄로 세운다
      await m.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [c.userId]);
      const used: Row[] = await m.query(
        `SELECT s.* FROM subscription_charges ch JOIN subscriptions s ON s.id = ch.subscription_id WHERE ch.provider = $1 AND ch.transaction_id = $2`,
        [c.provider, c.transactionId],
      );
      if (used.length) return used[0].user_id === c.userId ? { kind: 'ALREADY_APPLIED', subscription: toSub(used[0]) } : { kind: 'TX_USED' };

      const active: Row[] = await m.query(`SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'ACTIVE'`, [c.userId]);
      let sub: SubscriptionRecord;
      let kind: 'STARTED' | 'RENEWED';
      if (active.length) {
        const cur = toSub(active[0]);
        if (c.periodEnd.getTime() <= cur.currentPeriodEnd.getTime()) return { kind: 'ALREADY_SUBSCRIBED', subscription: cur };
        const rows = returned(
          await m.query(
            `UPDATE subscriptions SET plan_id = $2, provider = $3, current_period_start = $4, current_period_end = $5,
               credits_remaining = $6, cancel_at_period_end = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [cur.id, c.plan.id, c.provider, c.periodStart, c.periodEnd, c.plan.creditsPerPeriod],
          ),
        );
        sub = toSub(rows[0]);
        kind = 'RENEWED';
      } else {
        const rows: Row[] = await m.query(
          `INSERT INTO subscriptions (user_id, plan_id, provider, current_period_start, current_period_end, credits_remaining)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [c.userId, c.plan.id, c.provider, c.periodStart, c.periodEnd, c.plan.creditsPerPeriod],
        );
        sub = toSub(rows[0]);
        kind = 'STARTED';
      }
      await m.query(
        `INSERT INTO subscription_charges (subscription_id, provider, transaction_id, amount, period_start, period_end) VALUES ($1, $2, $3, $4, $5, $6)`,
        [sub.id, c.provider, c.transactionId, c.amount, c.periodStart, c.periodEnd],
      );
      return { kind, subscription: sub };
    });
  }

  async setCancelAtPeriodEnd(subscriptionId: string, value: boolean) {
    const rows = returned(
      await this.ds.query(`UPDATE subscriptions SET cancel_at_period_end = $2, updated_at = NOW() WHERE id = $1 AND status = 'ACTIVE' RETURNING *`, [subscriptionId, value]),
    );
    return rows[0] ? toSub(rows[0]) : null;
  }

  async expire(subscriptionId: string) {
    await this.ds.query(`UPDATE subscriptions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`, [subscriptionId]);
  }

  async redeemCredit(userId: string, subscriptionId: string, bookId: string, now: Date): Promise<RedeemResult> {
    return this.ds.transaction(async (m) => {
      const rows: Row[] = await m.query(`SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`, [subscriptionId]);
      const s = rows[0] ? toSub(rows[0]) : null;
      if (!s || s.userId !== userId || s.status !== 'ACTIVE' || s.currentPeriodEnd.getTime() <= now.getTime()) return 'NOT_ACTIVE';
      const owned: Row[] = await m.query(`SELECT 1 FROM library WHERE user_id = $1 AND book_id = $2`, [userId, bookId]);
      if (owned.length) return 'ALREADY_OWNED';
      if (s.creditsRemaining <= 0) return 'NO_CREDIT';
      await m.query(`UPDATE subscriptions SET credits_remaining = credits_remaining - 1, updated_at = NOW() WHERE id = $1`, [subscriptionId]);
      await m.query(`INSERT INTO library (user_id, book_id, source, subscription_id, purchased_at) VALUES ($1, $2, 'SUBSCRIPTION', $3, $4)`, [userId, bookId, subscriptionId, now]);
      await m.query(`UPDATE books SET sales_count = sales_count + 1 WHERE id = $1`, [bookId]);
      return 'OK';
    });
  }

  async librarySources(userId: string) {
    const rows: Row[] = await this.ds.query(`SELECT book_id, source FROM library WHERE user_id = $1`, [userId]);
    return Object.fromEntries(rows.map((r) => [r.book_id as string, r.source === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PURCHASE'])) as Record<string, 'PURCHASE' | 'SUBSCRIPTION'>;
  }
}
