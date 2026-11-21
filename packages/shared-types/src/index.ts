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
  /** 층으로 나뉜 움직이는 장면 (있으면 앱이 imageUrl 대신 이걸 움직여 보여 준다) */
  scene?: PageScene;
}

// ───── 층 장면 (캐릭터·배경을 따로 움직이는 그림) ─────

export type LayerMotionKind = 'drift' | 'slide' | 'bob' | 'sway' | 'breathe' | 'blink' | 'twinkle' | 'rise' | 'spin' | 'ramp';

/**
 * 층 하나의 움직임. 모든 값은 '쪽 길이 D 와 재생 위치 t' 만으로 계산돼서, 멈추면 멈추고 되감으면 같은 모습이에요.
 * 좌표·크기는 그림 너비·높이에 대한 비율, 각도는 도(°), 시간은 초, start/end 는 쪽 길이에 대한 비율(0~1).
 */
export interface LayerMotion {
  kind: LayerMotionKind;
  /** bob/rise: 높이 비율 · sway/spin 제외: 각도(도) · breathe: 크기 변화 비율 · twinkle: 깜빡임 깊이 0~1 */
  amp?: number;
  period?: number;
  /** 0~1, 시작 위치를 어긋나게 */
  phase?: number;
  /** drift: 쪽 전체 동안 움직일 거리(너비·높이 비율) */
  dx?: number;
  dy?: number;
  /** slide: 시작/끝 위치(비율) */
  from?: [number, number];
  to?: [number, number];
  /** slide/ramp 가 일어나는 구간 (쪽 길이 비율) */
  start?: number;
  end?: number;
  /** blink: 눈 감는 시간(초) */
  dur?: number;
  /** ramp: 시작/끝 투명도 */
  opFrom?: number;
  opTo?: number;
}

export interface SceneLayer {
  id: string;
  /** 투명 PNG 주소 (서버가 절대/상대 주소로 채워 줌) */
  url: string;
  /** 회전·확대의 중심 (그림 비율, 기본 0.5 0.5) */
  px?: number;
  py?: number;
  motion: LayerMotion[];
}

export interface PageScene {
  layers: SceneLayer[];
}

export interface BookPreview {
  bookId: string;
  totalPages: number;
  previewPages: number;
  pages: BookPage[];
  /** 그림 움직임 설정 (관리자가 책마다 정함) */
  motion: MotionSettings;
}

// ───── 읽어주기: 목소리·그림 움직임 설정 (관리자 수정) ─────

export type MotionCamera = 'auto' | 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'still';
export type MotionParticles = 'auto' | 'sparkle' | 'snow' | 'none';
export interface MotionSettings {
  /** false 면 이 책은 그림을 움직이지 않는다 */
  enabled: boolean;
  camera: MotionCamera;
  particles: MotionParticles;
}
export const DEFAULT_MOTION: MotionSettings = { enabled: true, camera: 'auto', particles: 'auto' };

/** 낭독 목소리 선택지 (id 는 audio/voices.json 과 같아야 한다) */
export const NARRATION_VOICES = [
  { id: 'narrator', name: '동화 이야기꾼 (여성)' },
  { id: 'uncle', name: '다정한 아저씨 (남성)' },
  { id: 'friend', name: '또렷한 친구 (남성)' },
] as const;
export type NarrationVoiceId = (typeof NARRATION_VOICES)[number]['id'];

// ───── 관리자 (콘텐츠 수정) ─────

export interface AdminBookSummary {
  id: string;
  title: string;
  coverUrl: string;
  price: number;
  status: BookStatus;
  pageCount: number;
  categories: Pick<Category, 'id' | 'slug' | 'name'>[];
}

export interface AdminPage {
  pageNumber: number;
  content: string;
  imageUrl: string;
}

export interface AdminBookDetail extends AdminBookSummary {
  description: string;
  keywords: string[];
  ageMin: number;
  ageMax: number;
  previewPages: number;
  storeProductId: string | null;
  narrationVoice: NarrationVoiceId;
  /** 읽는 속도 보정(%), -30 ~ +30 */
  narrationRate: number;
  motion: MotionSettings;
  pages: AdminPage[];
}

export interface AdminBookPatch {
  title?: string;
  description?: string;
  keywords?: string[];
  price?: number;
  ageMin?: number;
  ageMax?: number;
  previewPages?: number;
  status?: Extract<BookStatus, 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>;
  categorySlugs?: string[];
  narrationVoice?: NarrationVoiceId;
  narrationRate?: number;
  motion?: Partial<MotionSettings>;
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
  /** 관리자 이메일로 지정된 계정인지 */
  isAdmin?: boolean;
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
  /** 어떻게 들어왔는지: 구매 / 구독 소장권 */
  source: 'PURCHASE' | 'SUBSCRIPTION';
}

// ───── 구독 (월 소장권) ─────

export interface SubscriptionPlan {
  code: string;
  name: string;
  description: string;
  price: number;
  periodDays: number;
  creditsPerPeriod: number;
  storeProductId: string | null;
}

export interface MySubscription {
  id: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'EXPIRED';
  provider: PaymentProviderName;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  creditsRemaining: number;
  /** 해지 예약됨: 기간 끝까지 사용 가능, 이후 자동 결제 안 됨 */
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionVerifyResult {
  success: boolean;
  /** STARTED 새로 시작, RENEWED 갱신, ALREADY_APPLIED 이미 반영된 영수증 */
  result: 'STARTED' | 'RENEWED' | 'ALREADY_APPLIED';
  subscription: MySubscription;
}

export interface RedeemCreditResult {
  bookId: string;
  creditsRemaining: number;
}
