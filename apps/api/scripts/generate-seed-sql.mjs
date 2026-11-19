// src/seed/storybooks.json → database/seeds/001_storybooks.sql
// 같은 시드를 여러 번 넣어도 안전하도록 ON CONFLICT 로 갱신한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, '../src/seed/storybooks.json'), 'utf8'));
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `ARRAY[${a.map(q).join(', ')}]::text[]`;
const pad = (n) => String(n).padStart(2, '0');

const lines = ['-- 자동 생성 파일: pnpm --filter @storybook/api seed:sql', 'BEGIN;'];
for (const c of seed.categories) {
  lines.push(
    `INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES (${q(c.id)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(c.emoji)}, ${c.sortOrder})
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;`,
  );
}
for (const b of seed.books) {
  lines.push(
    `INSERT INTO books (id, store_product_id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES (${q(b.id)}, ${q(b.storeProductId)}, ${q(b.title)}, ${q(b.description)}, ${arr(b.keywords)}, ${q(`books/${b.id}/cover.png`)}, ${b.price}, ${b.ageMin}, ${b.ageMax}, ${b.pages.length}, ${b.previewPages}, ${b.salesCount}, 'PUBLISHED', ${q(b.publishedAt)})
  ON CONFLICT (id) DO UPDATE SET store_product_id = EXCLUDED.store_product_id, title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();`,
  );
  b.pages.forEach((content, i) => {
    lines.push(
      `INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES (${q(b.id)}, ${i + 1}, ${q(content)}, ${q(`books/${b.id}/page-${pad(i + 1)}.png`)})
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;`,
    );
  });
  for (const slug of b.categorySlugs) {
    const c = seed.categories.find((x) => x.slug === slug);
    lines.push(`INSERT INTO book_categories (book_id, category_id) VALUES (${q(b.id)}, ${q(c.id)}) ON CONFLICT DO NOTHING;`);
  }
}
lines.push('COMMIT;', '');
const out = join(here, '../../../database/seeds/001_storybooks.sql');
writeFileSync(out, lines.join('\n'));
console.log(`시드 SQL 생성: ${out} (카테고리 ${seed.categories.length}, 동화 ${seed.books.length})`);
