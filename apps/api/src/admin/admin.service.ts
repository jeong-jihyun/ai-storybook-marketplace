import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { AdminBookDetail, AdminBookSummary, BookStatus } from '@storybook/shared-types';
import { assetUrl } from '../common/asset-url';
import { CATALOG_REPOSITORY, type BookPatch, type BookRecord, type CatalogRepository } from '../catalog/catalog.repository';
import { normalizeMotion } from '../common/motion-defaults';
import { AssetStorage, MAX_IMAGE_BYTES, sniffImage } from './asset-storage';
import type { UpdateBookDto } from './admin.dto';

const toSummary = (b: BookRecord): AdminBookSummary => ({
  id: b.id,
  title: b.title,
  coverUrl: assetUrl(b.coverImageKey),
  price: b.price,
  status: b.status,
  pageCount: b.pageCount,
  categories: b.categories,
});

/** 관리자 콘텐츠 수정. 모든 변경은 감사 기록(admin_audit_logs)에 남긴다. */
@Injectable()
export class AdminService {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly repo: CatalogRepository, private readonly storage: AssetStorage) {}

  async list(): Promise<AdminBookSummary[]> {
    return (await this.repo.listAllBooks()).map(toSummary);
  }

  private async mustFind(id: string): Promise<BookRecord> {
    const b = await this.repo.findBookById(id);
    if (!b) throw new NotFoundException({ code: 'BOOK_NOT_FOUND', message: '동화책을 찾을 수 없어요.' });
    return b;
  }

  async detail(id: string): Promise<AdminBookDetail> {
    const b = await this.mustFind(id);
    const pages = await this.repo.findPages(id, 1, b.pageCount);
    return {
      ...toSummary(b),
      description: b.description,
      keywords: b.keywords,
      ageMin: b.ageMin,
      ageMax: b.ageMax,
      previewPages: b.previewPages,
      storeProductId: b.storeProductId,
      narrationVoice: b.narrationVoice as AdminBookDetail['narrationVoice'],
      narrationRate: b.narrationRate,
      motion: b.motion,
      pages: pages.map((p) => ({ pageNumber: p.pageNumber, content: p.content, imageUrl: assetUrl(p.imageKey) })),
    };
  }

  async update(adminId: string, id: string, dto: UpdateBookDto): Promise<AdminBookDetail> {
    const b = await this.mustFind(id);
    const patch: BookPatch = {};
    if (dto.title !== undefined) {
      patch.title = dto.title.trim();
      if (!patch.title) throw new BadRequestException({ code: 'VALIDATION', message: '제목을 입력해 주세요.' });
    }
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.keywords) patch.keywords = [...new Set(dto.keywords.map((k) => k.trim()).filter(Boolean))];
    if (dto.price !== undefined) patch.price = dto.price;
    const ageMin = dto.ageMin ?? b.ageMin;
    const ageMax = dto.ageMax ?? b.ageMax;
    if (ageMin > ageMax) throw new BadRequestException({ code: 'VALIDATION', message: '시작 나이가 끝 나이보다 클 수 없어요.' });
    if (dto.ageMin !== undefined) patch.ageMin = dto.ageMin;
    if (dto.ageMax !== undefined) patch.ageMax = dto.ageMax;
    if (dto.previewPages !== undefined) {
      if (dto.previewPages > b.pageCount) throw new BadRequestException({ code: 'VALIDATION', message: `무료 미리보기는 전체 ${b.pageCount}쪽 이하로 정해 주세요.` });
      patch.previewPages = dto.previewPages;
    }
    if (dto.status) {
      if (dto.status === 'PUBLISHED') {
        const pages = await this.repo.findPages(id, 1, b.pageCount);
        if (!pages.length || pages.some((p) => !p.content.trim())) {
          throw new BadRequestException({ code: 'NOT_READY', message: '모든 쪽에 글이 있어야 판매를 시작할 수 있어요.' });
        }
      }
      patch.status = dto.status as BookStatus;
    }
    if (dto.categorySlugs) {
      const known = new Set((await this.repo.listCategories()).map((c) => c.slug));
      const bad = dto.categorySlugs.filter((s) => !known.has(s));
      if (bad.length) throw new BadRequestException({ code: 'VALIDATION', message: `없는 카테고리예요: ${bad.join(', ')}` });
      patch.categorySlugs = [...new Set(dto.categorySlugs)];
    }
    if (dto.narrationVoice !== undefined) patch.narrationVoice = dto.narrationVoice;
    if (dto.narrationRate !== undefined) patch.narrationRate = dto.narrationRate;
    if (dto.motion) patch.motion = normalizeMotion(dto.motion, b.motion);

    if (!Object.keys(patch).length) return this.detail(id);
    await this.repo.updateBook(id, patch);
    await this.repo.audit(adminId, 'BOOK_UPDATE', id, { fields: Object.keys(patch), from: pick(b, Object.keys(patch)), status: patch.status });
    return this.detail(id);
  }

  async setPageContent(adminId: string, id: string, n: number, content: string): Promise<AdminBookDetail> {
    const text = content.trim();
    if (!text) throw new BadRequestException({ code: 'VALIDATION', message: '글을 입력해 주세요.' });
    const b = await this.mustFind(id);
    if (n < 1 || n > b.pageCount || !(await this.repo.setPageContent(id, n, text))) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: '없는 쪽이에요.' });
    await this.repo.audit(adminId, 'PAGE_UPDATE', id, { page: n, chars: text.length });
    return this.detail(id);
  }

  async addPage(adminId: string, id: string, content: string): Promise<AdminBookDetail> {
    const text = content.trim();
    if (!text) throw new BadRequestException({ code: 'VALIDATION', message: '새 쪽의 글을 입력해 주세요.' });
    await this.mustFind(id);
    const p = await this.repo.addPage(id, text);
    if (!p) throw new NotFoundException({ code: 'BOOK_NOT_FOUND', message: '동화책을 찾을 수 없어요.' });
    await this.repo.audit(adminId, 'PAGE_ADD', id, { page: p.pageNumber });
    return this.detail(id);
  }

  async removeLastPage(adminId: string, id: string): Promise<AdminBookDetail> {
    await this.mustFind(id);
    const n = await this.repo.removeLastPage(id);
    if (n === null) throw new BadRequestException({ code: 'LAST_PAGE', message: '책에는 최소 1쪽이 있어야 해요.' });
    await this.repo.audit(adminId, 'PAGE_REMOVE', id, { page: n });
    return this.detail(id);
  }

  private decode(base64: string): Buffer {
    const raw = base64.replace(/^data:[^,]*,/, '');
    const buf = Buffer.from(raw, 'base64');
    if (buf.length > MAX_IMAGE_BYTES) throw new PayloadTooLargeException({ code: 'IMAGE_TOO_LARGE', message: '그림이 너무 커요. 3MB 이하로 줄여 주세요.' });
    if (!sniffImage(buf)) throw new BadRequestException({ code: 'NOT_IMAGE', message: 'PNG·JPEG·WebP 그림 파일만 올릴 수 있어요.' });
    return buf;
  }

  private async store(id: string, name: string, base64: string): Promise<string> {
    const buf = this.decode(base64);
    try {
      return await this.storage.putImage(`books/${id}`, name, buf);
    } catch (e) {
      throw new BadRequestException({ code: 'UPLOAD_FAILED', message: `그림을 저장하지 못했어요. ${(e as Error).message.slice(0, 80)}` });
    }
  }

  async setPageImage(adminId: string, id: string, n: number, base64: string): Promise<AdminBookDetail> {
    const b = await this.mustFind(id);
    if (n < 1 || n > b.pageCount) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: '없는 쪽이에요.' });
    const key = await this.store(id, `page-${String(n).padStart(2, '0')}`, base64);
    await this.repo.setPageImage(id, n, key);
    await this.repo.audit(adminId, 'PAGE_IMAGE', id, { page: n });
    return this.detail(id);
  }

  async setCover(adminId: string, id: string, base64: string): Promise<AdminBookDetail> {
    await this.mustFind(id);
    const key = await this.store(id, 'cover', base64);
    await this.repo.setCoverImage(id, key);
    await this.repo.audit(adminId, 'COVER_IMAGE', id, {});
    return this.detail(id);
  }
}

function pick(b: BookRecord, keys: string[]) {
  const src = b as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}
