import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { BookDetail, BookPage, BookPreview, BookSummary, Category, HomeFeed, Paginated } from '@storybook/shared-types';
import { assetUrl } from '../common/asset-url';
import { CATALOG_REPOSITORY, type BookQuery, type BookRecord, type CatalogRepository, type PageRecord } from './catalog.repository';

@Injectable()
export class CatalogService {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly repo: CatalogRepository) {}

  private toSummary(b: BookRecord): BookSummary {
    return {
      id: b.id,
      title: b.title,
      coverUrl: assetUrl(b.coverImageKey),
      price: b.price,
      ageMin: b.ageMin,
      ageMax: b.ageMax,
      pageCount: b.pageCount,
      categories: b.categories,
      publishedAt: b.publishedAt.toISOString(),
    };
  }

  private toPage(p: PageRecord): BookPage {
    return { bookId: p.bookId, pageNumber: p.pageNumber, content: p.content, imageUrl: assetUrl(p.imageKey) };
  }

  async categories(): Promise<Category[]> {
    const rows = await this.repo.listCategories();
    return rows.map(({ sortOrder: _s, ...c }) => c);
  }

  async listBooks(query: BookQuery): Promise<Paginated<BookSummary>> {
    const { rows, total } = await this.repo.findPublishedBooks(query);
    return {
      items: rows.map((b) => this.toSummary(b)),
      page: query.page,
      limit: query.limit,
      total,
      hasNext: query.page * query.limit < total,
    };
  }

  async home(): Promise<HomeFeed> {
    const [popular, latest, categories] = await Promise.all([
      this.repo.findPublishedBooks({ sort: 'popular', page: 1, limit: 6 }),
      this.repo.findPublishedBooks({ sort: 'latest', page: 1, limit: 6 }),
      this.categories(),
    ]);
    // 추천: 1단계에서는 카테고리별 인기 1권씩 (BOOK-008 개인화 추천은 P2)
    const recommended: BookRecord[] = [];
    for (const c of categories) {
      const { rows } = await this.repo.findPublishedBooks({ categorySlug: c.slug, sort: 'popular', page: 1, limit: 3 });
      const pick = rows.find((r) => !recommended.some((x) => x.id === r.id));
      if (pick) recommended.push(pick);
    }
    return {
      recommended: recommended.map((b) => this.toSummary(b)),
      popular: popular.rows.map((b) => this.toSummary(b)),
      latest: latest.rows.map((b) => this.toSummary(b)),
      categories,
    };
  }

  /** 판매 중(PUBLISHED)인 책만 사용자에게 보인다. 그 외 상태는 없는 책으로 취급 */
  private async getPublished(id: string): Promise<BookRecord> {
    const b = await this.repo.findBookById(id);
    if (!b || b.status !== 'PUBLISHED') throw new NotFoundException({ code: 'BOOK_NOT_FOUND', message: '동화책을 찾을 수 없어요.' });
    return b;
  }

  async detail(id: string): Promise<BookDetail> {
    const b = await this.getPublished(id);
    return {
      ...this.toSummary(b),
      description: b.description,
      keywords: b.keywords,
      previewPages: Math.min(b.previewPages, b.pageCount),
      status: b.status,
      purchasable: b.status === 'PUBLISHED',
    };
  }

  async preview(id: string): Promise<BookPreview> {
    const b = await this.getPublished(id);
    const n = Math.min(b.previewPages, b.pageCount);
    const pages = await this.repo.findPages(id, 1, n);
    return { bookId: id, totalPages: b.pageCount, previewPages: n, pages: pages.map((p) => this.toPage(p)) };
  }

  /**
   * 페이지 한 장 조회. 1단계에서는 미리보기 범위만 허용한다.
   * (2·3단계에서 구매 권한(library)이 있으면 전체 페이지 허용으로 확장)
   */
  async page(id: string, pageNumber: number): Promise<BookPage> {
    const b = await this.getPublished(id);
    if (pageNumber < 1 || pageNumber > b.pageCount) {
      throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: '없는 페이지예요.' });
    }
    if (pageNumber > b.previewPages) {
      throw new ForbiddenException({ code: 'PURCHASE_REQUIRED', message: '이 페이지는 구매 후 읽을 수 있어요.' });
    }
    const [p] = await this.repo.findPages(id, pageNumber, pageNumber);
    return this.toPage(p);
  }
}
