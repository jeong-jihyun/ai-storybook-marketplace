import type { AuthTokens, Me } from '@storybook/shared-types';
import { create } from 'zustand';
import { secureStorage } from '../services/storage';

const KEY = 'donghwasup.session';

interface SessionState {
  hydrated: boolean;
  /** 로그인이 만료되어 자동으로 풀렸는지 (로그인 화면 안내용) */
  expired: boolean;
  user: Me | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** 보호자 확인 토큰 (메모리에만, 10분) */
  parent: { token: string; until: number } | null;
  hydrate: () => Promise<void>;
  setTokens: (t: AuthTokens) => Promise<void>;
  setUser: (u: Me) => void;
  setParent: (token: string, ttlSec: number) => void;
  validParentToken: () => string | null;
  clear: () => Promise<void>;
  expire: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  hydrated: false,
  expired: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  parent: null,
  async hydrate() {
    const raw = await secureStorage.get(KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as Pick<SessionState, 'user' | 'accessToken' | 'refreshToken'>;
        set({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken });
      } catch {
        await secureStorage.set(KEY, null);
      }
    }
    set({ hydrated: true });
  },
  async setTokens(t) {
    set({ user: t.user, accessToken: t.accessToken, refreshToken: t.refreshToken, expired: false });
    await secureStorage.set(KEY, JSON.stringify({ user: t.user, accessToken: t.accessToken, refreshToken: t.refreshToken }));
  },
  setUser(u) {
    set({ user: u });
    const { accessToken, refreshToken } = get();
    void secureStorage.set(KEY, JSON.stringify({ user: u, accessToken, refreshToken }));
  },
  setParent(token, ttlSec) {
    // 만료 30초 전부터는 새로 확인받는다
    set({ parent: { token, until: Date.now() + (ttlSec - 30) * 1000 } });
  },
  validParentToken() {
    const p = get().parent;
    return p && p.until > Date.now() ? p.token : null;
  },
  async clear() {
    set({ user: null, accessToken: null, refreshToken: null, parent: null });
    await secureStorage.set(KEY, null);
  },
  async expire() {
    if (!get().user) return;
    await get().clear();
    set({ expired: true });
  },
}));
