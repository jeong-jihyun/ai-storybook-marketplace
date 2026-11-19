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

export interface CommerceStore {
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

export const COMMERCE_STORE = Symbol('COMMERCE_STORE');
