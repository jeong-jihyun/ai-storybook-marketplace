import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { CommerceStore, NewUser, OrderRecord, OrderStatus, PaymentInput, PaymentResult, UserPatch, UserRecord, UserStatus } from './commerce.store';

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
    const rows: Row[] = await this.ds.query(`UPDATE users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...entries.map(([, v]) => v)]);
    // TypeORM 의 postgres UPDATE ... RETURNING 결과는 [rows, count] 형태
    const list = Array.isArray(rows[0]) ? (rows[0] as unknown as Row[]) : rows;
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
}
