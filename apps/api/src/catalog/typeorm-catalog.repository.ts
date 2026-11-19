import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { BookStatus } from '@storybook/shared-types';
import { Between, DataSource } from 'typeorm';
import type { BookQuery, BookRecord, CatalogRepository, CategoryRecord, PageRecord } from './catalog.repository';
import { BookEntity, BookPageEntity, CategoryEntity } from './entities/catalog.entities';

const toRecord = (b: BookEntity): BookRecord => ({
  id: b.id,
  title: b.title,
  description: b.description ?? '',
  keywords: b.keywords ?? [],
  coverImageKey: b.coverImageKey ?? '',
  price: b.price,
  ageMin: b.ageMin ?? 0,
  ageMax: b.ageMax ?? 99,
  pageCount: b.pageCount,
  previewPages: b.previewPages,
  salesCount: b.salesCount,
  status: b.status as BookStatus,
  publishedAt: b.publishedAt ?? b.createdAt,
  categories: (b.categories ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
});

/** PostgreSQL(TypeORM) 카탈로그 저장소 */
@Injectable()
export class TypeOrmCatalogRepository implements CatalogRepository {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async listCategories(): Promise<CategoryRecord[]> {
    const rows = await this.ds
      .getRepository(CategoryEntity)
      .createQueryBuilder('c')
      .leftJoin('book_categories', 'bc', 'bc.category_id = c.id')
      .leftJoin('books', 'b', "b.id = bc.book_id AND b.status = 'PUBLISHED'")
      .where('c.is_active = true')
      .select(['c.id AS id', 'c.slug AS slug', 'c.name AS name', 'c.description AS description', 'c.emoji AS emoji', 'c.sort_order AS "sortOrder"'])
      .addSelect('COUNT(b.id)::int', 'bookCount')
      .groupBy('c.id')
      .orderBy('c.sort_order', 'ASC')
      .getRawMany<CategoryRecord>();
    return rows.map((r) => ({ ...r, description: r.description ?? '', emoji: r.emoji ?? '' }));
  }

  async findPublishedBooks(query: BookQuery) {
    const qb = this.ds
      .getRepository(BookEntity)
      .createQueryBuilder('b')
      .where("b.status = 'PUBLISHED'");
    if (query.categorySlug) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM book_categories bc JOIN categories c ON c.id = bc.category_id WHERE bc.book_id = b.id AND c.slug = :slug)`,
        { slug: query.categorySlug },
      );
    }
    if (query.age !== undefined) qb.andWhere('b.age_min <= :age AND b.age_max >= :age', { age: query.age });
    if (query.q?.trim()) {
      qb.andWhere(
        `(b.title ILIKE :q OR b.description ILIKE :q OR EXISTS (SELECT 1 FROM unnest(b.keywords) k WHERE k ILIKE :q))`,
        { q: `%${query.q.trim().replace(/[%_\\]/g, (m) => '\\' + m)}%` },
      );
    }
    switch (query.sort) {
      case 'popular':
        qb.orderBy('b.sales_count', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('b.price', 'ASC').addOrderBy('b.published_at', 'DESC');
        break;
      case 'price_desc':
        qb.orderBy('b.price', 'DESC').addOrderBy('b.published_at', 'DESC');
        break;
      default:
        qb.orderBy('b.published_at', 'DESC');
    }
    const total = await qb.getCount();
    const ids = await qb
      .clone()
      .select('b.id', 'id')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<{ id: string }>();
    if (!ids.length) return { rows: [], total };
    const books = await this.ds.getRepository(BookEntity).find({
      where: ids.map((r) => ({ id: r.id })),
      relations: { categories: true },
    });
    const order = new Map(ids.map((r, i) => [r.id, i]));
    books.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return { rows: books.map(toRecord), total };
  }

  async findBookById(id: string) {
    const b = await this.ds.getRepository(BookEntity).findOne({ where: { id }, relations: { categories: true } });
    return b ? toRecord(b) : null;
  }

  async findPages(bookId: string, fromPage: number, toPage: number): Promise<PageRecord[]> {
    const pages = await this.ds.getRepository(BookPageEntity).find({
      where: { bookId, pageNumber: Between(fromPage, toPage) },
      order: { pageNumber: 'ASC' },
    });
    return pages.map((p) => ({ bookId: p.bookId, pageNumber: p.pageNumber, content: p.content, imageKey: p.imageKey ?? '' }));
  }
}
