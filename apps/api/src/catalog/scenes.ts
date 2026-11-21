import type { LayerMotion, PageScene } from '@storybook/shared-types';
import { assetUrl } from '../common/asset-url';
import scenesJson from '../seed/scenes.json';

interface RawLayer {
  id: string;
  file: string;
  px: number;
  py: number;
  motion: unknown[];
}
interface RawPage {
  base: string;
  layers: RawLayer[];
}
const data = scenesJson as unknown as Record<string, { pages: Record<string, RawPage> }>;

/**
 * 층 장면. 쪽 그림이 아직 처음(시드) 그림 그대로일 때만 붙인다.
 * 관리자가 그림을 바꾸면 층 장면은 자동으로 빠지고, 바꾼 그림이 그대로 보인다.
 */
export function sceneFor(bookId: string, pageNumber: number, imageKey: string): PageScene | undefined {
  const page = data[bookId]?.pages?.[String(pageNumber)];
  if (!page || page.base !== imageKey) return undefined;
  return {
    layers: page.layers.map((l) => ({ id: l.id, url: assetUrl(l.file), px: l.px, py: l.py, motion: l.motion as LayerMotion[] })),
  };
}
