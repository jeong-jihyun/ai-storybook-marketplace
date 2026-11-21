import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { sceneFor } from '../src/catalog/scenes';
import scenesJson from '../src/seed/scenes.json';

const TORI = 'b0000001-5b00-4c00-8000-000000000001';
const KINDS = ['drift', 'slide', 'bob', 'sway', 'breathe', 'blink', 'twinkle', 'rise', 'spin', 'ramp'];
const pages = (scenesJson as unknown as Record<string, { pages: Record<string, { base: string; layers: { id: string; file: string; px: number; py: number; motion: { kind: string }[] }[] }> }>)[TORI]!.pages;

describe('층 장면 (움직이는 그림)', () => {
  it('토리 8쪽 모두 층이 있고, 그림 파일이 실제로 있으며, 움직임 종류가 올바르다', () => {
    expect(Object.keys(pages)).toHaveLength(8);
    for (const [n, pg] of Object.entries(pages)) {
      expect(pg.base).toBe(`books/${TORI}/page-0${n}.png`);
      expect(pg.layers.length).toBeGreaterThan(5);
      const ids = new Set<string>();
      for (const l of pg.layers) {
        expect(ids.has(l.id)).toBe(false);
        ids.add(l.id);
        expect(existsSync(resolve(__dirname, '../storage', l.file))).toBe(true);
        expect(l.px).toBeGreaterThanOrEqual(0);
        expect(l.px).toBeLessThanOrEqual(1);
        expect(l.py).toBeGreaterThanOrEqual(0);
        expect(l.py).toBeLessThanOrEqual(1);
        for (const m of l.motion) expect(KINDS).toContain(m.kind);
      }
    }
  });

  it('쪽 그림이 처음 그림 그대로일 때만 붙는다 (관리자가 바꾸면 빠짐)', () => {
    expect(sceneFor(TORI, 1, `books/${TORI}/page-01.png`)?.layers.length).toBeGreaterThan(5);
    expect(sceneFor(TORI, 1, `uploads/books/${TORI}/page-01-abcd1234.png`)).toBeUndefined();
    expect(sceneFor(TORI, 1, 'https://example.com/x.png')).toBeUndefined();
    expect(sceneFor('b0000002-5b00-4c00-8000-000000000002', 1, 'books/x/page-01.png')).toBeUndefined();
    expect(sceneFor(TORI, 9, `books/${TORI}/page-09.png`)).toBeUndefined();
  });

  describe('API', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createApp({ databaseUrl: '', logger: false });
    });
    afterAll(async () => {
      await app.close();
    });

    it('미리보기 쪽에 scene 이 담기고, 층 그림이 내려받아진다', async () => {
      const r = await request(app.getHttpServer()).get(`/api/v1/books/${TORI}/preview`).expect(200);
      const p1 = r.body.pages[0];
      expect(p1.scene.layers.length).toBeGreaterThan(5);
      const img = await request(app.getHttpServer()).get(p1.scene.layers[0].url).expect(200);
      expect(img.headers['content-type']).toBe('image/png');
    });

    it('층 장면이 없는 책은 scene 없이 그림 한 장만 준다', async () => {
      const list = await request(app.getHttpServer()).get('/api/v1/books?limit=20').expect(200);
      const other = list.body.items.find((b: { id: string }) => b.id !== TORI);
      const r = await request(app.getHttpServer()).get(`/api/v1/books/${other.id}/preview`).expect(200);
      expect(r.body.pages[0].scene).toBeUndefined();
      expect(r.body.pages[0].imageUrl).toBeTruthy();
    });
  });
});
