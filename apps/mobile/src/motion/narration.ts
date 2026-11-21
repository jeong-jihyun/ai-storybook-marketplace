import { useQuery } from '@tanstack/react-query';
import type { Cue } from './captions';

/**
 * 낭독 음성은 GitHub Actions(.github/workflows/voice.yml)가 만들어 저장소 audio/ 에 올린다.
 * 앱은 jsDelivr(CDN)에서 받고, 안 되면 raw.githubusercontent 로 한 번 더 시도한다.
 */
const REPO = 'jeong-jihyun/ai-storybook-marketplace';
const BASES = [
  (process.env.EXPO_PUBLIC_AUDIO_BASE ?? `https://cdn.jsdelivr.net/gh/${REPO}@main/audio`).replace(/\/$/, ''),
  `https://raw.githubusercontent.com/${REPO}/main/audio`,
];

export interface NarrationPage {
  file: string;
  duration: number;
  hash: string;
  cues: Cue[];
}
export interface NarrationManifest {
  version: number;
  books: Record<string, { pages: Record<string, NarrationPage> }>;
}

async function fetchManifest(): Promise<{ manifest: NarrationManifest; base: string } | null> {
  for (const base of BASES) {
    try {
      const res = await fetch(`${base}/manifest.json`);
      if (!res.ok) continue;
      const manifest = (await res.json()) as NarrationManifest;
      if (manifest?.books) return { manifest, base };
    } catch {
      // 다음 주소로
    }
  }
  return null;
}

/** 음성이 아직 없거나 받을 수 없으면 null — 그때는 소리 없이(그림 움직임만) 동작한다 */
export function useNarrationManifest() {
  return useQuery({ queryKey: ['narration-manifest'], queryFn: fetchManifest, staleTime: 10 * 60 * 1000, retry: false });
}

export function narrationFor(data: { manifest: NarrationManifest; base: string } | null | undefined, bookId: string, pageNumber: number) {
  const e = data?.manifest.books[bookId]?.pages[String(pageNumber)];
  if (!data || !e) return null;
  return { ...e, url: `${data.base}/${e.file}?v=${e.hash}` };
}
