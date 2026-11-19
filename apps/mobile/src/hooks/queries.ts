import type { BookSort } from '@storybook/shared-types';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSession } from '../store/session';

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: api.home });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.categories, staleTime: 10 * 60_000 });
export const useBook = (id: string) => useQuery({ queryKey: ['book', id], queryFn: () => api.book(id), enabled: !!id });
export const usePreview = (id: string) => useQuery({ queryKey: ['preview', id], queryFn: () => api.preview(id), enabled: !!id });

export const SORT_OPTIONS: { value: BookSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'price_asc', label: '낮은 가격순' },
  { value: 'price_desc', label: '높은 가격순' },
];
export const isSort = (v: unknown): v is BookSort => SORT_OPTIONS.some((o) => o.value === v);

/** 카테고리·나이 조건 목록 (무한 스크롤) */
export function useBookList(category: string | undefined, sort: BookSort, age?: number) {
  return useInfiniteQuery({
    queryKey: ['books', category ?? 'all', sort, age ?? 'any'],
    queryFn: ({ pageParam }) => api.books({ category, sort, age, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useSearch(q: string, sort: BookSort) {
  const term = q.trim();
  return useQuery({
    queryKey: ['search', term, sort],
    queryFn: () => api.search(term, { sort }),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  });
}

// ───── 2단계 ─────

const useUserId = () => useSession((s) => s.user?.id ?? 'guest');

/** 로그인 상태에 따라 구매 여부(owned)가 달라지므로 사용자별로 캐시 */
export const useBookForUser = (id: string) => {
  const uid = useUserId();
  return useQuery({ queryKey: ['book', id, uid], queryFn: () => api.book(id), enabled: !!id });
};
export const useLibrary = () => {
  const uid = useUserId();
  return useQuery({ queryKey: ['library', uid], queryFn: api.library, enabled: uid !== 'guest' });
};
export const useOrders = () => {
  const uid = useUserId();
  return useQuery({ queryKey: ['orders', uid], queryFn: api.orders, enabled: uid !== 'guest' });
};
export const useOrder = (id: string) => useQuery({ queryKey: ['order', id], queryFn: () => api.order(id), enabled: !!id });
export const useOwnedPages = (bookId: string) => {
  const uid = useUserId();
  return useQuery({ queryKey: ['owned-pages', bookId, uid], queryFn: () => api.ownedPages(bookId), enabled: !!bookId && uid !== 'guest' });
};
