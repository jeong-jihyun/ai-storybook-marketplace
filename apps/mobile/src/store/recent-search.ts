import { create } from 'zustand';

// 최근 검색어 (앱 실행 중 UI 상태 — 기기 저장은 3단계에서 추가)
interface RecentSearchState {
  terms: string[];
  add: (t: string) => void;
  remove: (t: string) => void;
  clear: () => void;
}

export const useRecentSearch = create<RecentSearchState>((set) => ({
  terms: [],
  add: (t) => set((s) => ({ terms: [t, ...s.terms.filter((x) => x !== t)].slice(0, 8) })),
  remove: (t) => set((s) => ({ terms: s.terms.filter((x) => x !== t) })),
  clear: () => set({ terms: [] }),
}));
