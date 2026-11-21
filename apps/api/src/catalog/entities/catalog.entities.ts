import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

// 테이블 구조는 database/migrations/001_init.sql 이 기준이다. (synchronize 사용 안 함)

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 50, unique: true }) slug: string;
  @Column({ type: 'varchar', length: 100 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 10, nullable: true }) emoji: string | null;
  @Column({ name: 'sort_order', type: 'int', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
}

@Entity('books')
export class BookEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'text', array: true, default: () => "'{}'" }) keywords: string[];
  @Column({ name: 'cover_image_key', type: 'text', nullable: true }) coverImageKey: string | null;
  @Column({ name: 'store_product_id', type: 'varchar', length: 100, nullable: true }) storeProductId: string | null;
  @Column({ type: 'int' }) price: number;
  @Column({ name: 'age_min', type: 'smallint', nullable: true }) ageMin: number | null;
  @Column({ name: 'age_max', type: 'smallint', nullable: true }) ageMax: number | null;
  @Column({ name: 'page_count', type: 'int', default: 0 }) pageCount: number;
  @Column({ name: 'preview_pages', type: 'int', default: 2 }) previewPages: number;
  @Column({ name: 'sales_count', type: 'int', default: 0 }) salesCount: number;
  @Column({ type: 'varchar', length: 20, default: 'DRAFT' }) status: string;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' }) createdAt: Date;
  @Column({ name: 'narration_voice', type: 'varchar', length: 30, default: 'narrator' }) narrationVoice: string;
  @Column({ name: 'narration_rate', type: 'smallint', default: 0 }) narrationRate: number;
  @Column({ type: 'jsonb', default: () => "'{}'" }) motion: Record<string, unknown>;

  @ManyToMany(() => CategoryEntity)
  @JoinTable({ name: 'book_categories', joinColumn: { name: 'book_id' }, inverseJoinColumn: { name: 'category_id' } })
  categories: CategoryEntity[];

  @OneToMany(() => BookPageEntity, (p) => p.book) pages: BookPageEntity[];
}

@Entity('book_pages')
export class BookPageEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'book_id', type: 'uuid' }) bookId: string;
  @ManyToOne(() => BookEntity, (b) => b.pages) @JoinColumn({ name: 'book_id' }) book: BookEntity;
  @Column({ name: 'page_number', type: 'int' }) pageNumber: number;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'image_key', type: 'text', nullable: true }) imageKey: string | null;
}

export const catalogEntities = [CategoryEntity, BookEntity, BookPageEntity];
