import type { ApiError, BookDetail, BookPreview, BookSort, BookSummary, Category, HomeFeed, Paginated } from '@storybook/shared-types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api/v1${path}${qs ? `?${qs}` : ''}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', '인터넷 연결을 확인해 주세요.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(res.status, body?.code ?? 'ERROR', body?.message ?? '잠시 후 다시 시도해 주세요.');
  }
  return res.json() as Promise<T>;
}

export const api = {
  home: () => get<HomeFeed>('/home'),
  categories: () => get<Category[]>('/categories'),
  books: (p: { category?: string; sort?: BookSort; age?: number; page?: number; limit?: number }) => get<Paginated<BookSummary>>('/books', p),
  search: (q: string, p: { sort?: BookSort; page?: number } = {}) => get<Paginated<BookSummary>>('/books/search', { q, ...p }),
  book: (id: string) => get<BookDetail>(`/books/${id}`),
  preview: (id: string) => get<BookPreview>(`/books/${id}/preview`),
};
