// 회원·주문·결제·구매 권한 저장소 인터페이스
// - PgCommerceStore: PostgreSQL (DATABASE_URL 있을 때, 운영)
// - MemoryCommerceStore: 메모리 (DB 없는 로컬·테스트)

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: string;
  status: UserStatus;
  nickname: string | null;
  tokenVersion: number;
  parentPinHash: string | null;
  pinFailCount: number;
  pinLockedUntil: Date | null;
  parentConsentAt: Date | null;
  createdAt: Date;
}

export interface OrderRecord {
  id: string;
  userId: string;
  totalAmount: number;
  status: OrderStatus;
  idempotencyKey: string | null;
  createdAt: Date;
  paidAt: Date | null;
  items: { bookId: string; unitPrice: number }[];
  payment: { provider: string; transactionId: string; verifiedAt: Date } | null;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  nickname: string | null;
  parentPinHash: string;
  parentConsentAt: Date;
}

export type UserPatch = Partial<
  Pick<UserRecord, 'email' | 'passwordHash' | 'nickname' | 'parentPinHash' | 'pinFailCount' | 'pinLockedUntil' | 'tokenVersion' | 'status'> & {
    withdrawnAt: Date;
  }
>;

export interface PaymentInput {
  orderId: string;
  userId: string;
  provider: string;
  transactionId: string;
  productId: string | null;
  amount: number;
}

export type PaymentResult =
  | { kind: 'PAID'; order: OrderRecord } // 이번에 결제 확정
  | { kind: 'ALREADY_PAID'; order: OrderRecord } // 같은 거래로 이미 확정 (재시도·중복 호출)
  | { kind: 'TX_USED'; order: OrderRecord } // 다른 주문에 이미 쓰인 거래번호
  | { kind: 'ORDER_CLOSED'; order: OrderRecord }; // 다른 거래로 이미 결제됐거나 취소된 주문

export interface CommerceStore extends SubscriptionStore {
  createUser(u: NewUser): Promise<UserRecord | null>; // 이메일 중복이면 null
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  updateUser(id: string, patch: UserPatch): Promise<UserRecord | null>;

  /** 같은 사용자·같은 멱등성 키면 기존 주문을 돌려준다 */
  createOrder(userId: string, idempotencyKey: string, items: { bookId: string; unitPrice: number }[]): Promise<{ order: OrderRecord; created: boolean }>;
  findOrder(id: string): Promise<OrderRecord | null>;
  listOrders(userId: string, limit: number): Promise<OrderRecord[]>;
  markOrder(id: string, status: 'FAILED' | 'CANCELED'): Promise<OrderRecord | null>; // PENDING 일 때만 바뀜

  /** 결제 확정 + 구매 권한 부여 + 판매량 증가를 한 번에 (트랜잭션) */
  completePayment(p: PaymentInput): Promise<PaymentResult>;

  listLibrary(userId: string): Promise<{ bookId: string; purchasedAt: Date }[]>;
  ownsBook(userId: string, bookId: string): Promise<boolean>;
}

// ───── 구독 (월 소장권) ─────

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  periodDays: number;
  creditsPerPeriod: number;
  storeProductId: string | null;
  isActive: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED';
  provider: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  creditsRemaining: number;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

export interface SubscriptionChargeInput {
  userId: string;
  plan: PlanRecord;
  provider: string;
  transactionId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}

export type ChargeResult =
  | { kind: 'STARTED' | 'RENEWED' | 'ALREADY_APPLIED'; subscription: SubscriptionRecord }
  | { kind: 'TX_USED' } // 다른 사람·다른 구독에 이미 쓰인 거래번호
  | { kind: 'ALREADY_SUBSCRIBED'; subscription: SubscriptionRecord }; // 이미 기간이 남은 구독이 있음

export type RedeemResult = 'OK' | 'NO_CREDIT' | 'ALREADY_OWNED' | 'NOT_ACTIVE';

export interface SubscriptionStore {
  listPlans(): Promise<PlanRecord[]>;
  findPlan(by: { id?: string; code?: string; productId?: string }): Promise<PlanRecord | null>;
  findActiveSubscription(userId: string): Promise<SubscriptionRecord | null>;
  /** 구독 결제 반영: 처음이면 시작, 기간이 이어지면 갱신(소장권 다시 채움). 같은 거래번호는 한 번만 */
  applyCharge(c: SubscriptionChargeInput): Promise<ChargeResult>;
  setCancelAtPeriodEnd(subscriptionId: string, value: boolean): Promise<SubscriptionRecord | null>;
  expire(subscriptionId: string): Promise<void>;
  /** 소장권 1장으로 책 받기 (트랜잭션: 남은 수 확인 → 차감 → 서재 등록) */
  redeemCredit(userId: string, subscriptionId: string, bookId: string, now: Date): Promise<RedeemResult>;
  librarySources(userId: string): Promise<Record<string, 'PURCHASE' | 'SUBSCRIPTION'>>;
}

export const COMMERCE_STORE = Symbol('COMMERCE_STORE');
