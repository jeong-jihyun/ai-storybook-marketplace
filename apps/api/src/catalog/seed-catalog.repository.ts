import { Injectable } from '@nestjs/common';
import type { BookStatus } from '@storybook/shared-types';
import { DEFAULT_MOTION_SETTINGS } from '../common/motion-defaults';
import seed from '../seed/storybooks.json';
import type { BookPatch, BookQuery, BookRecord, CatalogRepository, CategoryRecord, PageRecord } from './catalog.repository';

const pad = (n: number) => String(n).padStart(2, '0');

/** DB 없이 시드 JSON 으로 동작하는 카탈로그 저장소 (개발·데모용) */
@Injectable()
export class SeedCatalogRepository implements CatalogRepository {
  private readonly categories = seed.categories;
  private readonly books: BookRecord[] = seed.books.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    keywords: b.keywords,
    coverImageKey: `books/${b.id}/cover.png`,
    storeProductId: b.storeProductId,
    price: b.price,
    ageMin: b.ageMin,
    ageMax: b.ageMax,
    pageCount: b.pages.length,
    previewPages: b.previewPages,
    salesCount: b.salesCount,
    status: 'PUBLISHED' as BookStatus,
    publishedAt: new Date(b.publishedAt),
    categories: b.categorySlugs.map((slug) => {
      const c = seed.categories.find((x) => x.slug === slug)!;
      return { id: c.id, slug: c.slug, name: c.name };
    }),
    narrationVoice: 'narrator',
    narrationRate: 0,
    motion: { ...DEFAULT_MOTION_SETTINGS },
  }));
  /** 쪽 본문·그림 (관리자가 고칠 수 있게 시드를 복사해 둠 — 서버를 다시 켜면 시드로 돌아감) */
  private readonly pages = new Map<string, { content: string; imageKey: string }[]>(
    seed.books.map((b) => [b.id, b.pages.map((content, i) => ({ content, imageKey: `books/${b.id}/page-${pad(i + 1)}.png` }))]),
  );
  readonly auditLog: { adminId: string; action: string; bookId: string; detail: unknown }[] = [];

  async listCategories(): Promise<CategoryRecord[]> {
    return this.categories
      .map((c) => ({
        ...c,
        bookCount: this.books.filter((b) => b.status === 'PUBLISHED' && b.categories.some((x) => x.slug === c.slug)).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findPublishedBooks(query: BookQuery) {
    const q = query.q?.trim().toLowerCase();
    let rows = this.books.filter((b) => b.status === 'PUBLISHED');
    if (query.categorySlug) rows = rows.filter((b) => b.categories.some((c) => c.slug === query.categorySlug));
    if (query.age !== undefined) rows = rows.filter((b) => b.ageMin <= query.age! && b.ageMax >= query.age!);
    if (q) {
      rows = rows.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }
    rows = [...rows].sort((a, b) => {
      switch (query.sort) {
        case 'popular':
          return b.salesCount - a.salesCount;
        case 'price_asc':
          return a.price - b.price || b.publishedAt.getTime() - a.publishedAt.getTime();
        case 'price_desc':
          return b.price - a.price || b.publishedAt.getTime() - a.publishedAt.getTime();
        default:
          return b.publishedAt.getTime() - a.publishedAt.getTime();
      }
    });
    const start = (query.page - 1) * query.limit;
    return { rows: rows.slice(start, start + query.limit), total: rows.length };
  }

  async findBookById(id: string) {
    return this.books.find((b) => b.id === id) ?? null;
  }

  async findBookByProductId(productId: string) {
    return this.books.find((b) => b.storeProductId === productId) ?? null;
  }

  async findPages(bookId: string, fromPage: number, toPage: number): Promise<PageRecord[]> {
    const list = this.pages.get(bookId);
    if (!list) return [];
    return list
      .map((p, i) => ({ bookId, pageNumber: i + 1, content: p.content, imageKey: p.imageKey }))
      .filter((p) => p.pageNumber >= fromPage && p.pageNumber <= toPage);
  }

  // ── 관리자 ──
  async listAllBooks() {
    return [...this.books].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  }

  async updateBook(id: string, patch: BookPatch) {
    const b = this.books.find((x) => x.id === id);
    if (!b) return null;
    const { categorySlugs, ...rest } = patch;
    Object.assign(b, rest);
    if (categorySlugs) {
      b.categories = categorySlugs.map((slug) => {
        const c = seed.categories.find((x) => x.slug === slug)!;
        return { id: c.id, slug: c.slug, name: c.name };
      });
    }
    if (patch.status === 'PUBLISHED' && !b.publishedAt) b.publishedAt = new Date();
    return b;
  }

  async setPageContent(bookId: string, n: number, content: string) {
    const p = this.pages.get(bookId)?.[n - 1];
    if (!p) return false;
    p.content = content;
    return true;
  }

  async addPage(bookId: string, content: string) {
    const list = this.pages.get(bookId);
    const b = this.books.find((x) => x.id === bookId);
    if (!list || !b) return null;
    list.push({ content, imageKey: '' });
    b.pageCount = list.length;
    return { bookId, pageNumber: list.length, content, imageKey: '' };
  }

  async removeLastPage(bookId: string) {
    const list = this.pages.get(bookId);
    const b = this.books.find((x) => x.id === bookId);
    if (!list || !b || list.length <= 1) return null;
    list.pop();
    b.pageCount = list.length;
    b.previewPages = Math.min(b.previewPages, list.length);
    return list.length + 1;
  }

  async setPageImage(bookId: string, n: number, imageKey: string) {
    const p = this.pages.get(bookId)?.[n - 1];
    if (!p) return false;
    p.imageKey = imageKey;
    return true;
  }

  async setCoverImage(bookId: string, imageKey: string) {
    const b = this.books.find((x) => x.id === bookId);
    if (!b) return false;
    b.coverImageKey = imageKey;
    return true;
  }

  async audit(adminId: string, action: string, bookId: string, detail: unknown) {
    this.auditLog.push({ adminId, action, bookId, detail });
  }
}
