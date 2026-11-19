import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app.factory';

const TORI = 'b0000001-5b00-4c00-8000-000000000001'; // 미리보기 3쪽, 8쪽
const BRUSH = 'b0000001-5b00-4c00-8000-000000000005'; // 미리보기 2쪽

// 같은 시나리오를 시드 데이터와 PostgreSQL 두 저장소에 똑같이 돌려 결과가 같은지 확인한다.
const targets: [string, string | undefined][] = [['시드 데이터', '']];
if (process.env.TEST_DATABASE_URL) targets.push(['PostgreSQL', process.env.TEST_DATABASE_URL]);

describe.each(targets)('카탈로그 API (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApp({ databaseUrl, logger: false });
  });
  afterAll(async () => app?.close());

  it('상태 확인', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('카테고리 5개와 권수', async () => {
    const res = await api().get('/api/v1/categories').expect(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0]).toMatchObject({ slug: 'adventure', name: '용기와 모험', bookCount: 3 });
    expect(res.body.find((c: { slug: string }) => c.slug === 'nature').bookCount).toBe(4);
  });

  it('목록: 최신순 기본, 페이지네이션', async () => {
    const res = await api().get('/api/v1/books?limit=4').expect(200);
    expect(res.body).toMatchObject({ page: 1, limit: 4, total: 10, hasNext: true });
    expect(res.body.items[0].title).toBe('혼자서도 척척 곰돌이');
    const p3 = await api().get('/api/v1/books?limit=4&page=3').expect(200);
    expect(p3.body.items).toHaveLength(2);
    expect(p3.body.hasNext).toBe(false);
  });

  it('목록: 카테고리·나이·가격 정렬 필터', async () => {
    const bedtime = await api().get('/api/v1/books?category=bedtime').expect(200);
    expect(bedtime.body.total).toBe(2);
    const age10 = await api().get('/api/v1/books?age=10').expect(200);
    expect(age10.body.items.map((b: { title: string }) => b.title)).toEqual(['무지개 다리 너머']);
    const cheap = await api().get('/api/v1/books?sort=price_asc').expect(200);
    expect(cheap.body.items[0].price).toBe(2900);
  });

  it('인기 도서는 판매량 순', async () => {
    const res = await api().get('/api/v1/books/bestsellers?limit=3').expect(200);
    expect(res.body.items.map((b: { title: string }) => b.title)).toEqual(['반짝반짝 이 닦기 왕국', '달빛 기차를 탄 토끼 토리', '용감한 꼬마 거북 바다']);
  });

  it('검색: 제목·키워드, 대소문자/공백 무시, 결과 없음', async () => {
    const owl = await api().get('/api/v1/books/search').query({ q: ' 부엉이 ' }).expect(200);
    expect(owl.body.items.map((b: { title: string }) => b.title)).toContain('별을 세는 부엉이');
    expect(owl.body.total).toBe(1); // 본문(차장 부엉이)은 검색 대상이 아님: 제목·소개·키워드 기준
    const none = await api().get('/api/v1/books/search').query({ q: '공룡' }).expect(200);
    expect(none.body).toMatchObject({ total: 0, items: [] });
    const pct = await api().get('/api/v1/books/search').query({ q: '%' }).expect(200);
    expect(pct.body.total).toBe(0);
    await api().get('/api/v1/books/search').expect(400);
  });

  it('상세: 판매 가능 여부와 표지 주소', async () => {
    const res = await api().get(`/api/v1/books/${TORI}`).expect(200);
    expect(res.body).toMatchObject({ title: '달빛 기차를 탄 토끼 토리', price: 4900, pageCount: 8, previewPages: 3, purchasable: true, status: 'PUBLISHED' });
    expect(res.body.coverUrl).toBe(`/api/v1/assets/books/${TORI}/cover.png`);
    await api().get(res.body.coverUrl).expect(200).expect('Content-Type', /png/);
  });

  it('상세: 없는 책·잘못된 ID', async () => {
    const nf = await api().get('/api/v1/books/00000000-0000-4000-8000-000000000000').expect(404);
    expect(nf.body.code).toBe('BOOK_NOT_FOUND');
    await api().get('/api/v1/books/not-a-uuid').expect(400);
  });

  it('미리보기: 지정된 페이지까지만', async () => {
    const res = await api().get(`/api/v1/books/${BRUSH}/preview`).expect(200);
    expect(res.body).toMatchObject({ totalPages: 8, previewPages: 2 });
    expect(res.body.pages.map((p: { pageNumber: number }) => p.pageNumber)).toEqual([1, 2]);
    expect(res.body.pages[0].imageUrl).toMatch(/page-01\.png$/);
  });

  it('페이지 조회: 미리보기 밖은 구매 필요(403), 범위 밖은 404', async () => {
    await api().get(`/api/v1/books/${TORI}/pages/3`).expect(200);
    const locked = await api().get(`/api/v1/books/${TORI}/pages/4`).expect(403);
    expect(locked.body.code).toBe('PURCHASE_REQUIRED');
    await api().get(`/api/v1/books/${TORI}/pages/9`).expect(404);
    await api().get(`/api/v1/books/${TORI}/pages/0`).expect(404);
  });

  it('홈: 추천·인기·신규·카테고리', async () => {
    const res = await api().get('/api/v1/home').expect(200);
    expect(res.body.popular).toHaveLength(6);
    expect(res.body.latest).toHaveLength(6);
    expect(res.body.categories).toHaveLength(5);
    const ids = res.body.recommended.map((b: { id: string }) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it('잘못된 쿼리는 400', async () => {
    await api().get('/api/v1/books?sort=hack').expect(400);
    await api().get('/api/v1/books?limit=999').expect(400);
    await api().get('/api/v1/books?category=DROP%20TABLE').expect(400);
  });

  it('없는 그림 파일은 404', async () => {
    await api().get('/api/v1/assets/books/nope.png').expect(404);
  });
});
