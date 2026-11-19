import { Injectable } from '@nestjs/common';
import type { BookStatus } from '@storybook/shared-types';
import seed from '../seed/storybooks.json';
import type { BookQuery, BookRecord, CatalogRepository, CategoryRecord, PageRecord } from './catalog.repository';

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
  }));

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
    const book = seed.books.find((b) => b.id === bookId);
    if (!book) return [];
    return book.pages
      .map((content, i) => ({ bookId, pageNumber: i + 1, content, imageKey: `books/${bookId}/page-${pad(i + 1)}.png` }))
      .filter((p) => p.pageNumber >= fromPage && p.pageNumber <= toPage);
  }
}
