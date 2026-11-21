import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';
import { secureStorage } from '../services/storage';

const KEY = 'donghwasup.reader-prefs';
export const SPEEDS = [0.8, 1, 1.25] as const;

interface Prefs {
  hydrated: boolean;
  narration: boolean;
  captions: boolean;
  speed: number;
  /** 모션 줄이기: 처음엔 기기의 '동작 줄이기' 설정을 따르고, 직접 바꾸면 그 값을 기억 */
  reduceMotion: boolean;
  hydrate: () => Promise<void>;
  set: (p: Partial<Pick<Prefs, 'narration' | 'captions' | 'speed' | 'reduceMotion'>>) => void;
}

export const useReaderPrefs = create<Prefs>((set, get) => ({
  hydrated: false,
  narration: true,
  captions: true,
  speed: 1,
  reduceMotion: false,
  async hydrate() {
    if (get().hydrated) return;
    let saved: Partial<Prefs> | null = null;
    try {
      const raw = await secureStorage.get(KEY);
      saved = raw ? (JSON.parse(raw) as Partial<Prefs>) : null;
    } catch {
      saved = null;
    }
    let system = false;
    try {
      system = await AccessibilityInfo.isReduceMotionEnabled();
    } catch {
      system = false;
    }
    set({
      hydrated: true,
      narration: saved?.narration ?? true,
      captions: saved?.captions ?? true,
      speed: SPEEDS.includes(saved?.speed as never) ? (saved!.speed as number) : 1,
      reduceMotion: saved?.reduceMotion ?? system,
    });
  },
  set(p) {
    set(p);
    const { narration, captions, speed, reduceMotion } = get();
    void secureStorage.set(KEY, JSON.stringify({ narration, captions, speed, reduceMotion }));
  },
}));
