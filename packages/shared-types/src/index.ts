// 앱(mobile)·서버(api)·관리자(admin)가 함께 쓰는 API 응답 타입
// 서버 응답 모양이 바뀌면 이 파일을 먼저 고친다.

/** 상품 판매 상태 (설계서 5.1) */
export type BookStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  bookCount: number;
}

export interface BookSummary {
  id: string;
  title: string;
  coverUrl: string;
  /** 원화 정수 금액 */
  price: number;
  ageMin: number;
  ageMax: number;
  pageCount: number;
  categories: Pick<Category, 'id' | 'slug' | 'name'>[];
  publishedAt: string;
}

export interface BookDetail extends BookSummary {
  description: string;
  keywords: string[];
  previewPages: number;
  status: BookStatus;
  /** 지금 구매 가능한지 (PUBLISHED 일 때만 true) */
  purchasable: boolean;
  /** 로그인한 사용자가 이미 산 책인지 (로그인 안 했으면 false) */
  owned: boolean;
  storeProductId: string | null;
}

export interface BookPage {
  bookId: string;
  pageNumber: number;
  content: string;
  imageUrl: string;
}

export interface BookPreview {
  bookId: string;
  totalPages: number;
  previewPages: number;
  pages: BookPage[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export type BookSort = 'latest' | 'popular' | 'price_asc' | 'price_desc';

export interface HomeFeed {
  recommended: BookSummary[];
  popular: BookSummary[];
  latest: BookSummary[];
  categories: Category[];
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
}

// ───── 2단계: 회원·주문·결제·서재 ─────

export interface Me {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Me;
}

export type PaymentProviderName = 'TEST' | 'GOOGLE_PLAY' | 'APPLE';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED';

export interface OrderItem {
  book: Pick<BookSummary, 'id' | 'title' | 'coverUrl'> & { storeProductId: string | null };
  unitPrice: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
  payment: { provider: PaymentProviderName; transactionId: string; verifiedAt: string } | null;
}

export interface PaymentOptions {
  /** 지금 서버에서 쓸 수 있는 결제 방식 */
  providers: PaymentProviderName[];
  testMode: boolean;
}

export interface VerifyPaymentResult {
  success: boolean;
  paymentStatus: OrderStatus;
  entitlementGranted: boolean;
  bookIds: string[];
  order: Order;
}

export interface RestoreResult {
  restored: number;
  alreadyOwned: number;
  failed: number;
}

export interface LibraryItem {
  book: BookSummary;
  purchasedAt: string;
}
