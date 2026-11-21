import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { BookStatus } from '@storybook/shared-types';
import { Between, DataSource } from 'typeorm';
import { normalizeMotion } from '../common/motion-defaults';
import type { BookPatch, BookQuery, BookRecord, CatalogRepository, CategoryRecord, PageRecord } from './catalog.repository';
import { BookEntity, BookPageEntity, CategoryEntity } from './entities/catalog.entities';

const toRecord = (b: BookEntity): BookRecord => ({
  id: b.id,
  title: b.title,
  description: b.description ?? '',
  keywords: b.keywords ?? [],
  coverImageKey: b.coverImageKey ?? '',
  storeProductId: b.storeProductId ?? null,
  price: b.price,
  ageMin: b.ageMin ?? 0,
  ageMax: b.ageMax ?? 99,
  pageCount: b.pageCount,
  previewPages: b.previewPages,
  salesCount: b.salesCount,
  status: b.status as BookStatus,
  publishedAt: b.publishedAt ?? b.createdAt,
  categories: (b.categories ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  narrationVoice: b.narrationVoice ?? 'narrator',
  narrationRate: b.narrationRate ?? 0,
  motion: normalizeMotion(b.motion),
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

  async findBookByProductId(productId: string) {
    const b = await this.ds.getRepository(BookEntity).findOne({ where: { storeProductId: productId }, relations: { categories: true } });
    return b ? toRecord(b) : null;
  }

  async findPages(bookId: string, fromPage: number, toPage: number): Promise<PageRecord[]> {
    const pages = await this.ds.getRepository(BookPageEntity).find({
      where: { bookId, pageNumber: Between(fromPage, toPage) },
      order: { pageNumber: 'ASC' },
    });
    return pages.map((p) => ({ bookId: p.bookId, pageNumber: p.pageNumber, content: p.content, imageKey: p.imageKey ?? '' }));
  }

  // ── 관리자 ──
  async listAllBooks() {
    const books = await this.ds.getRepository(BookEntity).find({ relations: { categories: true }, order: { title: 'ASC' } });
    return books.map(toRecord);
  }

  async updateBook(id: string, patch: BookPatch) {
    return this.ds.transaction(async (m) => {
      const exists = await m.query('SELECT status, published_at FROM books WHERE id = $1 FOR UPDATE', [id]);
      if (!exists.length) return null;
      const cols: Record<string, unknown> = {
        title: patch.title,
        description: patch.description,
        keywords: patch.keywords,
        price: patch.price,
        age_min: patch.ageMin,
        age_max: patch.ageMax,
        preview_pages: patch.previewPages,
        status: patch.status,
        narration_voice: patch.narrationVoice,
        narration_rate: patch.narrationRate,
      };
      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const [k, v] of Object.entries(cols)) {
        if (v === undefined) continue;
        vals.push(v);
        sets.push(`${k} = $${vals.length}`);
      }
      if (patch.motion) {
        vals.push(JSON.stringify(patch.motion));
        sets.push(`motion = $${vals.length}::jsonb`);
      }
      if (patch.status === 'PUBLISHED' && !exists[0].published_at) sets.push('published_at = NOW()');
      sets.push('updated_at = NOW()');
      vals.push(id);
      await m.query(`UPDATE books SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
      if (patch.categorySlugs) {
        await m.query('DELETE FROM book_categories WHERE book_id = $1', [id]);
        if (patch.categorySlugs.length) {
          await m.query('INSERT INTO book_categories (book_id, category_id) SELECT $1, id FROM categories WHERE slug = ANY($2)', [id, patch.categorySlugs]);
        }
      }
      const b = await m.getRepository(BookEntity).findOne({ where: { id }, relations: { categories: true } });
      return b ? toRecord(b) : null;
    });
  }

  async setPageContent(bookId: string, pageNumber: number, content: string) {
    const r = await this.ds.query('UPDATE book_pages SET content = $3, updated_at = NOW() WHERE book_id = $1 AND page_number = $2 RETURNING id', [bookId, pageNumber, content]);
    return r.length > 0;
  }

  async addPage(bookId: string, content: string) {
    return this.ds.transaction(async (m) => {
      const b = await m.query('SELECT page_count FROM books WHERE id = $1 FOR UPDATE', [bookId]);
      if (!b.length) return null;
      const n = Number((await m.query('SELECT COALESCE(MAX(page_number), 0) AS n FROM book_pages WHERE book_id = $1', [bookId]))[0].n) + 1;
      await m.query("INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ($1, $2, $3, '')", [bookId, n, content]);
      await m.query('UPDATE books SET page_count = $2, updated_at = NOW() WHERE id = $1', [bookId, n]);
      return { bookId, pageNumber: n, content, imageKey: '' };
    });
  }

  async removeLastPage(bookId: string) {
    return this.ds.transaction(async (m) => {
      const b = await m.query('SELECT 1 FROM books WHERE id = $1 FOR UPDATE', [bookId]);
      if (!b.length) return null;
      const n = Number((await m.query('SELECT COALESCE(MAX(page_number), 0) AS n FROM book_pages WHERE book_id = $1', [bookId]))[0].n);
      if (n <= 1) return null;
      await m.query('DELETE FROM book_pages WHERE book_id = $1 AND page_number = $2', [bookId, n]);
      await m.query('UPDATE books SET page_count = $2, preview_pages = LEAST(preview_pages, $2), updated_at = NOW() WHERE id = $1', [bookId, n - 1]);
      return n;
    });
  }

  async setPageImage(bookId: string, pageNumber: number, imageKey: string) {
    const r = await this.ds.query('UPDATE book_pages SET image_key = $3, updated_at = NOW() WHERE book_id = $1 AND page_number = $2 RETURNING id', [bookId, pageNumber, imageKey]);
    return r.length > 0;
  }

  async setCoverImage(bookId: string, imageKey: string) {
    const r = await this.ds.query('UPDATE books SET cover_image_key = $2, updated_at = NOW() WHERE id = $1 RETURNING id', [bookId, imageKey]);
    return r.length > 0;
  }

  async audit(adminId: string, action: string, bookId: string, detail: unknown) {
    await this.ds.query('INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, detail) VALUES ($1, $2, $3, $4, $5::jsonb)', [adminId, action, 'BOOK', bookId, JSON.stringify(detail ?? null)]);
  }
}
