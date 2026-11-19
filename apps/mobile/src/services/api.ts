import type {
  ApiError,
  AuthTokens,
  BookDetail,
  BookPage,
  BookPreview,
  BookSort,
  BookSummary,
  Category,
  HomeFeed,
  LibraryItem,
  Me,
  Order,
  Paginated,
  PaymentOptions,
  PaymentProviderName,
  RestoreResult,
  VerifyPaymentResult,
} from '@storybook/shared-types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useSession } from '../store/session';

/**
 * API 주소 결정 순서
 * 1) EXPO_PUBLIC_API_URL 환경변수 (예: 같은 와이파이의 PC → http://192.168.0.10:4000)
 * 2) 웹: 같은 주소(배포 사이트의 /api/v1)
 * 3) 폰 앱: app.json extra.apiUrl (배포된 서버)
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
export const API_ORIGIN = (fromEnv ?? (Platform.OS === 'web' ? '' : fromConfig ?? '')).replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** 서버가 준 상대 주소(/api/v1/assets/...)를 실제 주소로 바꾼다 */
export const resolveAsset = (url: string) => (!url || /^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url}`);

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean; parent?: boolean; params?: Record<string, string | number | undefined> };

let refreshing: Promise<boolean> | null = null;

/** 액세스 토큰이 만료되면 한 번만 갱신 (여러 요청이 동시에 와도 갱신은 1번) — MEM-003 */
async function refreshTokens(): Promise<boolean> {
  const { refreshToken, setTokens, clear } = useSession.getState();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clear();
        return false;
      }
      await setTokens((await res.json()) as AuthTokens);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

async function request<T>(path: string, o: Opts = {}, retried = false): Promise<T> {
  const qs = o.params
    ? Object.entries(o.params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const s = useSession.getState();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  // 로그인한 상태면 공개 API 에도 토큰을 붙인다 (구매 여부 표시용)
  if (s.accessToken && o.auth !== false) headers.Authorization = `Bearer ${s.accessToken}`;
  if (o.parent) {
    const pt = s.validParentToken();
    if (pt) headers['X-Parent-Token'] = pt;
  }
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api/v1${path}${qs ? `?${qs}` : ''}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', '인터넷 연결을 확인해 주세요.');
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    const code = body?.code ?? 'ERROR';
    if (res.status === 401 && code === 'TOKEN_EXPIRED' && !retried && (await refreshTokens())) return request<T>(path, o, true);
    if (res.status === 401 && code === 'TOKEN_EXPIRED') await useSession.getState().clear();
    if (code === 'PARENT_REQUIRED') useSession.setState({ parent: null });
    throw new ApiRequestError(res.status, code, body?.message ?? '잠시 후 다시 시도해 주세요.');
  }
  return res.json() as Promise<T>;
}

const get = <T,>(path: string, params?: Opts['params']) => request<T>(path, { params });

export const api = {
  home: () => get<HomeFeed>('/home'),
  categories: () => get<Category[]>('/categories'),
  books: (p: { category?: string; sort?: BookSort; age?: number; page?: number; limit?: number }) => get<Paginated<BookSummary>>('/books', p),
  search: (q: string, p: { sort?: BookSort; page?: number } = {}) => get<Paginated<BookSummary>>('/books/search', { q, ...p }),
  book: (id: string) => get<BookDetail>(`/books/${id}`),
  preview: (id: string) => get<BookPreview>(`/books/${id}/preview`),

  // 회원·보호자
  signup: (b: { email: string; password: string; parentPin: string; nickname?: string; agreeTerms: boolean; parentConfirmed: boolean }) =>
    request<AuthTokens>('/auth/signup', { method: 'POST', body: b, auth: false }),
  login: (email: string, password: string) => request<AuthTokens>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<Me>('/users/me'),
  updateMe: (b: { nickname?: string; currentPassword?: string; newPassword?: string; newParentPin?: string }) =>
    request<{ user: Me } | AuthTokens>('/users/me', { method: 'PATCH', body: b, parent: true }),
  withdraw: () => request<void>('/users/me', { method: 'DELETE', parent: true }),
  verifyParent: (pin: string) => request<{ parentToken: string; expiresIn: number }>('/parent/verify', { method: 'POST', body: { pin } }),

  // 주문·결제
  paymentOptions: () => request<PaymentOptions>('/payments/options'),
  createOrder: (bookIds: string[], idempotencyKey: string) => request<Order>('/orders', { method: 'POST', body: { bookIds, idempotencyKey }, parent: true }),
  orders: () => request<Order[]>('/orders'),
  order: (id: string) => request<Order>(`/orders/${id}`),
  testCheckout: (orderId: string, outcome: 'success' | 'cancel' | 'fail') =>
    request<{ outcome: string; productId?: string; purchaseToken?: string; order?: Order }>('/payments/test/checkout', { method: 'POST', body: { orderId, outcome }, parent: true }),
  verifyPayment: (b: { orderId: string; provider: PaymentProviderName; productId?: string; purchaseToken: string }) =>
    request<VerifyPaymentResult>('/payments/verify', { method: 'POST', body: b, parent: true }),
  restore: (provider: PaymentProviderName, purchases: { productId: string; purchaseToken: string }[]) =>
    request<RestoreResult>('/payments/restore', { method: 'POST', body: { provider, purchases } }),

  // 서재
  library: () => request<LibraryItem[]>('/library'),
  ownedPages: (bookId: string) => request<{ title: string; totalPages: number; pages: BookPage[] }>(`/library/${bookId}/pages`),
};
