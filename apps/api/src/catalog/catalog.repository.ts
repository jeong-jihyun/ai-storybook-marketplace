import type { BookSort, BookStatus } from '@storybook/shared-types';

/** 저장소(DB 또는 시드 데이터)에서 꺼낸 카테고리 한 건 */
export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  sortOrder: number;
  bookCount: number;
}

/** 저장소에서 꺼낸 동화책 한 건 (페이지 본문 제외) */
export interface BookRecord {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  coverImageKey: string;
  price: number;
  ageMin: number;
  ageMax: number;
  pageCount: number;
  previewPages: number;
  salesCount: number;
  status: BookStatus;
  publishedAt: Date;
  categories: { id: string; slug: string; name: string }[];
}

export interface PageRecord {
  bookId: string;
  pageNumber: number;
  content: string;
  imageKey: string;
}

export interface BookQuery {
  categorySlug?: string;
  q?: string;
  age?: number;
  sort: BookSort;
  page: number;
  limit: number;
}

/**
 * 동화책 카탈로그 저장소.
 * - DATABASE_URL 이 있으면 PostgreSQL(TypeORM) 구현을 쓰고
 * - 없으면 시드 JSON(메모리) 구현을 써서 DB 없이도 앱을 확인할 수 있게 한다.
 * 일반 사용자 조회는 항상 PUBLISHED 상태만 대상으로 한다.
 */
export interface CatalogRepository {
  listCategories(): Promise<CategoryRecord[]>;
  findPublishedBooks(query: BookQuery): Promise<{ rows: BookRecord[]; total: number }>;
  findBookById(id: string): Promise<BookRecord | null>;
  findPages(bookId: string, fromPage: number, toPage: number): Promise<PageRecord[]>;
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
