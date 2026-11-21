import type { BookSort, BookStatus, MotionSettings } from '@storybook/shared-types';

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
  storeProductId: string | null;
  price: number;
  ageMin: number;
  ageMax: number;
  pageCount: number;
  previewPages: number;
  salesCount: number;
  status: BookStatus;
  publishedAt: Date;
  categories: { id: string; slug: string; name: string }[];
  /** 낭독 목소리(id)·속도 보정(%) — 음성 자동 생성이 읽는다 */
  narrationVoice: string;
  narrationRate: number;
  /** 그림 움직임 설정 */
  motion: MotionSettings;
}

/** 관리자가 책 한 권에서 바꿀 수 있는 값 (넘긴 것만 바뀜) */
export interface BookPatch {
  title?: string;
  description?: string;
  keywords?: string[];
  price?: number;
  ageMin?: number;
  ageMax?: number;
  previewPages?: number;
  status?: BookStatus;
  categorySlugs?: string[];
  narrationVoice?: string;
  narrationRate?: number;
  motion?: MotionSettings;
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
  findBookByProductId(productId: string): Promise<BookRecord | null>;
  findPages(bookId: string, fromPage: number, toPage: number): Promise<PageRecord[]>;

  // ── 관리자 ──
  /** 모든 상태의 책 (최근 수정 순서가 아니라 제목순) */
  listAllBooks(): Promise<BookRecord[]>;
  updateBook(id: string, patch: BookPatch): Promise<BookRecord | null>;
  setPageContent(bookId: string, pageNumber: number, content: string): Promise<boolean>;
  /** 맨 뒤에 새 쪽 추가. 책이 없으면 null */
  addPage(bookId: string, content: string): Promise<PageRecord | null>;
  /** 맨 뒤 쪽 삭제. 지운 쪽 번호, 못 지우면 null */
  removeLastPage(bookId: string): Promise<number | null>;
  setPageImage(bookId: string, pageNumber: number, imageKey: string): Promise<boolean>;
  setCoverImage(bookId: string, imageKey: string): Promise<boolean>;
  audit(adminId: string, action: string, bookId: string, detail: unknown): Promise<void>;
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
