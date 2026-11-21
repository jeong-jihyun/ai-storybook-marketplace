import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 요청 본문 한도(Vercel 4.5MB)에 base64(+33%)가 들어가도록

type Kind = 'png' | 'jpg' | 'webp';
const EXT: Record<Kind, { ext: string; type: string }> = {
  png: { ext: 'png', type: 'image/png' },
  jpg: { ext: 'jpg', type: 'image/jpeg' },
  webp: { ext: 'webp', type: 'image/webp' },
};

/** 파일 앞부분(매직 바이트)으로 진짜 PNG/JPEG/WebP 인지 확인 — 확장자·헤더 속임수 방지 */
export function sniffImage(buf: Buffer): Kind | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/**
 * 관리자가 올린 그림 보관.
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있으면 Supabase Storage(공개 버킷 'storybook')에 올리고 공개 주소를 돌려준다.
 * - 없으면(로컬·시험) 메모리에 두고 /api/v1/assets/uploads/… 로 제공한다 (재시작하면 사라짐).
 * 돌려주는 값은 그대로 image_key 에 저장된다 (https:// 로 시작하면 주소 그대로 사용).
 */
@Injectable()
export class AssetStorage {
  readonly memory = new Map<string, { buf: Buffer; type: string }>();

  private remote() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    return url && key ? { url, key } : null;
  }

  async putImage(folder: string, name: string, buf: Buffer): Promise<string> {
    const kind = sniffImage(buf);
    if (!kind) throw new Error('NOT_IMAGE');
    const { ext, type } = EXT[kind];
    // 파일 이름에 무작위 값을 넣어 주소가 바뀌게 한다 → 앱·CDN 캐시가 옛 그림을 붙들지 않음
    const path = `${folder}/${name}-${randomBytes(4).toString('hex')}.${ext}`;
    const r = this.remote();
    if (!r) {
      this.memory.set(path, { buf, type });
      return `uploads/${path}`;
    }
    const res = await fetch(`${r.url}/storage/v1/object/storybook/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${r.key}`, apikey: r.key, 'Content-Type': type, 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
      body: new Uint8Array(buf),
    });
    if (!res.ok) throw new Error(`UPLOAD_FAILED ${res.status} ${(await res.text()).slice(0, 120)}`);
    return `${r.url}/storage/v1/object/public/storybook/${path}`;
  }
}
