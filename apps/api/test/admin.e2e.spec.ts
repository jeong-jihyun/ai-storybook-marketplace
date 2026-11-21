import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DEFAULT_MOTION, NARRATION_VOICES } from '@storybook/shared-types';
import { createApp } from '../src/app.factory';
import { CATALOG_REPOSITORY, type BookRecord, type CatalogRepository, type PageRecord } from '../src/catalog/catalog.repository';
import { DEFAULT_MOTION_SETTINGS, VOICE_IDS } from '../src/common/motion-defaults';

const TORI = 'b0000001-5b00-4c00-8000-000000000001'; // 8쪽, 미리보기 3쪽
const PW = 'abcd1234';
const PIN = '1234';
const ADMIN = 'boss@example.com';

// 진짜 그림 파일 모양(앞부분 매직 바이트)만 갖춘 작은 PNG
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const b64 = (b: Buffer) => b.toString('base64');

const targets: [string, string | undefined][] = [['시드 데이터', '']];
if (process.env.TEST_DATABASE_URL) targets.push(['PostgreSQL', process.env.TEST_DATABASE_URL]);

describe.each(targets)('관리자 콘텐츠 수정 (%s)', (_name, databaseUrl) => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  let admin = '';
  let customer = '';

  async function signup(email: string) {
    const r = await api().post('/api/v1/auth/signup').send({ email, password: PW, parentPin: PIN, agreeTerms: true, parentConfirmed: true }).expect(201);
    return r.body as { accessToken: string; user: { isAdmin: boolean } };
  }

  // 실제 DB 에서는 수정이 남으므로, 시험이 끝나면 원래대로 되돌려 다른 시험에 영향이 없게 한다
  let repo: CatalogRepository;
  let origBook: BookRecord;
  let origPages: PageRecord[];

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = ` ${ADMIN.toUpperCase()} , other@example.com`;
    process.env.NARRATION_TOKEN = 'test-narration-token';
    app = await createApp({ databaseUrl, logger: false });
    repo = app.get<CatalogRepository>(CATALOG_REPOSITORY);
    origBook = (await repo.findBookById(TORI))!;
    origPages = await repo.findPages(TORI, 1, 100);
  });
  afterAll(async () => {
    if (repo && origBook) {
      const { id: _id, pageCount: _pc, salesCount: _sc, publishedAt: _pa, coverImageKey, storeProductId: _sp, categories, ...rest } = origBook;
      await repo.updateBook(TORI, { ...rest, categorySlugs: categories.map((c) => c.slug) });
      await repo.setCoverImage(TORI, coverImageKey);
      for (const p of origPages) {
        await repo.setPageContent(TORI, p.pageNumber, p.content);
        await repo.setPageImage(TORI, p.pageNumber, p.imageKey);
      }
    }
    delete process.env.ADMIN_EMAILS;
    delete process.env.NARRATION_TOKEN;
    await app?.close();
  });

  it('관리자 이메일(대소문자·공백 무시)만 isAdmin, 나머지는 거절', async () => {
    const email = `a${Date.now()}@example.com`;
    process.env.ADMIN_EMAILS = ` ${email.toUpperCase()} `;
    const a = await signup(email);
    expect(a.user.isAdmin).toBe(true);
    admin = a.accessToken;
    const c = await signup(`c${Date.now()}@example.com`);
    expect(c.user.isAdmin).toBe(false);
    customer = c.accessToken;
    const me = await api().get('/api/v1/users/me').set(bearer(admin)).expect(200);
    expect(me.body.isAdmin).toBe(true);

    await api().get('/api/v1/admin/books').expect(401);
    const no = await api().get('/api/v1/admin/books').set(bearer(customer)).expect(403);
    expect(no.body.code).toBe('ADMIN_ONLY');
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(customer)).send({ price: 100 }).expect(403);
    await api().put(`/api/v1/admin/books/${TORI}/cover`).set(bearer(customer)).send({ imageBase64: b64(PNG) }).expect(403);
  });

  it('ADMIN_EMAILS 가 비어 있으면 아무도 관리자가 아님', async () => {
    const email = `n${Date.now()}@example.com`;
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = '';
    const u = await signup(email);
    expect(u.user.isAdmin).toBe(false);
    await api().get('/api/v1/admin/books').set(bearer(u.accessToken)).expect(403);
    process.env.ADMIN_EMAILS = prev;
  });

  it('목록·상세: 모든 쪽과 설정이 들어 있다', async () => {
    const list = await api().get('/api/v1/admin/books').set(bearer(admin)).expect(200);
    expect(list.body).toHaveLength(10);
    const d = await api().get(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).expect(200);
    expect(d.body).toMatchObject({ id: TORI, status: 'PUBLISHED', pageCount: 8, previewPages: 3, narrationVoice: 'narrator', narrationRate: 0, motion: DEFAULT_MOTION_SETTINGS });
    expect(d.body.pages).toHaveLength(8);
    expect(d.body.pages[0].content).toContain('보름달');
  });

  it('제목·소개·가격 수정이 일반 화면에 바로 보인다 + 입력 검증', async () => {
    const r = await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ title: '  달빛 기차 토리  ', description: '새 소개', price: 3900, keywords: ['토끼', '토끼', ' 기차 ', ''] }).expect(200);
    expect(r.body).toMatchObject({ title: '달빛 기차 토리', description: '새 소개', price: 3900, keywords: ['토끼', '기차'] });
    const pub = await api().get(`/api/v1/books/${TORI}`).expect(200);
    expect(pub.body).toMatchObject({ title: '달빛 기차 토리', price: 3900 });
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ price: -1 }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ title: '   ' }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ ageMin: 9, ageMax: 5 }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ previewPages: 99 }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ status: 'REJECTED' }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ hack: 1 }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ categorySlugs: ['nope'] }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ price: 4900, title: '달빛 기차를 탄 토끼 토리' }).expect(200);
  });

  it('쪽 글 수정: 미리보기·읽기에 반영, 빈 글·없는 쪽 거절', async () => {
    await api().put(`/api/v1/admin/books/${TORI}/pages/2`).set(bearer(admin)).send({ content: '  고친 둘째 쪽  ' }).expect(200);
    const pre = await api().get(`/api/v1/books/${TORI}/preview`).expect(200);
    expect(pre.body.pages[1].content).toBe('고친 둘째 쪽');
    await api().put(`/api/v1/admin/books/${TORI}/pages/2`).set(bearer(admin)).send({ content: '   ' }).expect(400);
    await api().put(`/api/v1/admin/books/${TORI}/pages/99`).set(bearer(admin)).send({ content: 'x' }).expect(404);
    await api().put(`/api/v1/admin/books/${TORI}/pages/abc`).set(bearer(admin)).send({ content: 'x' }).expect(400);
  });

  it('쪽 추가·삭제: 쪽 수가 맞고, 마지막 1쪽은 못 지움', async () => {
    const add = await api().post(`/api/v1/admin/books/${TORI}/pages`).set(bearer(admin)).send({ content: '새로 붙인 마지막 쪽' }).expect(201);
    expect(add.body.pageCount).toBe(9);
    expect(add.body.pages[8]).toMatchObject({ pageNumber: 9, content: '새로 붙인 마지막 쪽', imageUrl: '' });
    const del = await api().delete(`/api/v1/admin/books/${TORI}/pages/last`).set(bearer(admin)).expect(200);
    expect(del.body.pageCount).toBe(8);
    const pub = await api().get(`/api/v1/books/${TORI}`).expect(200);
    expect(pub.body.pageCount).toBe(8);
  });

  it('그림 교체: PNG 는 되고, 가짜 파일·너무 큰 파일은 거절, 표지도 반영', async () => {
    const ok = await api().put(`/api/v1/admin/books/${TORI}/pages/1/image`).set(bearer(admin)).send({ imageBase64: `data:image/png;base64,${b64(PNG)}` }).expect(200);
    const url: string = ok.body.pages[0].imageUrl;
    expect(url).toMatch(/uploads\/books\/.+\/page-01-[0-9a-f]{8}\.png$/);
    const img = await api().get(url.replace(/^.*?(\/api\/v1)/, '$1')).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.body.equals(PNG)).toBe(true);
    const pre = await api().get(`/api/v1/books/${TORI}/preview`).expect(200);
    expect(pre.body.pages[0].imageUrl).toBe(url);

    const fake = await api().put(`/api/v1/admin/books/${TORI}/pages/1/image`).set(bearer(admin)).send({ imageBase64: b64(Buffer.from('<svg onload=alert(1)></svg>   ')) }).expect(400);
    expect(fake.body.code).toBe('NOT_IMAGE');
    const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
    const huge = await api().put(`/api/v1/admin/books/${TORI}/pages/1/image`).set(bearer(admin)).send({ imageBase64: b64(big) }).expect(413);
    expect(huge.body.code).toBe('IMAGE_TOO_LARGE');
    await api().put(`/api/v1/admin/books/${TORI}/pages/99/image`).set(bearer(admin)).send({ imageBase64: b64(PNG) }).expect(404);

    const cover = await api().put(`/api/v1/admin/books/${TORI}/cover`).set(bearer(admin)).send({ imageBase64: b64(PNG) }).expect(200);
    expect(cover.body.coverUrl).toMatch(/cover-[0-9a-f]{8}\.png$/);
    const detail = await api().get(`/api/v1/books/${TORI}`).expect(200);
    expect(detail.body.coverUrl).toBe(cover.body.coverUrl);
  });

  it('비공개(DRAFT)로 돌리면 사용자 화면에서 사라지고, 다시 판매하면 돌아온다', async () => {
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ status: 'DRAFT' }).expect(200);
    await api().get(`/api/v1/books/${TORI}`).expect(404);
    const list = await api().get('/api/v1/books?limit=20').expect(200);
    expect(list.body.total).toBe(9);
    const adminStill = await api().get(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).expect(200);
    expect(adminStill.body.status).toBe('DRAFT');
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ status: 'PUBLISHED' }).expect(200);
    await api().get(`/api/v1/books/${TORI}`).expect(200);
  });

  it('카테고리 바꾸기', async () => {
    const r = await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ categorySlugs: ['nature'] }).expect(200);
    expect(r.body.categories.map((c: { slug: string }) => c.slug)).toEqual(['nature']);
    const cats = await api().get('/api/v1/categories').expect(200);
    expect(cats.body.find((c: { slug: string }) => c.slug === 'nature').bookCount).toBe(5);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ categorySlugs: ['bedtime', 'adventure'] }).expect(200);
  });

  it('목소리·움직임 설정: 저장되고 미리보기 응답에 움직임이 실린다', async () => {
    const r = await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ narrationVoice: 'uncle', narrationRate: -10, motion: { camera: 'panLeft', particles: 'snow' } }).expect(200);
    expect(r.body).toMatchObject({ narrationVoice: 'uncle', narrationRate: -10, motion: { enabled: true, camera: 'panLeft', particles: 'snow' } });
    const pre = await api().get(`/api/v1/books/${TORI}/preview`).expect(200);
    expect(pre.body.motion).toEqual({ enabled: true, camera: 'panLeft', particles: 'snow' });
    // 일부만 바꿔도 나머지는 유지
    const off = await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ motion: { enabled: false } }).expect(200);
    expect(off.body.motion).toEqual({ enabled: false, camera: 'panLeft', particles: 'snow' });
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ narrationVoice: 'robot' }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ narrationRate: 99 }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ motion: { camera: 'spin' } }).expect(400);
    await api().patch(`/api/v1/admin/books/${TORI}`).set(bearer(admin)).send({ narrationVoice: 'narrator', narrationRate: 0, motion: DEFAULT_MOTION_SETTINGS }).expect(200);
  });

  it('음성 생성용 본문 목록은 토큰이 있어야 하고, 수정한 글이 반영된다', async () => {
    await api().get('/api/v1/narration/source').expect(401);
    await api().get('/api/v1/narration/source').set('x-narration-token', 'wrong').expect(401);
    await api().get('/api/v1/narration/source').set(bearer(admin)).expect(401); // 관리자 로그인만으로는 안 됨
    const r = await api().get('/api/v1/narration/source').set('x-narration-token', 'test-narration-token').expect(200);
    const tori = r.body.books.find((b: { id: string }) => b.id === TORI);
    expect(tori.pages).toHaveLength(8);
    expect(tori.pages[1]).toBe('고친 둘째 쪽');
    expect(tori).toMatchObject({ voice: 'narrator', rate: 0 });
    delete process.env.NARRATION_TOKEN;
    await api().get('/api/v1/narration/source').set('x-narration-token', '').expect(401); // 토큰 미설정이면 항상 거절
    process.env.NARRATION_TOKEN = 'test-narration-token';
  });

  it('서버 값과 shared-types 값이 같다', () => {
    expect(DEFAULT_MOTION).toEqual(DEFAULT_MOTION_SETTINGS);
    expect(NARRATION_VOICES.map((v) => v.id)).toEqual([...VOICE_IDS]);
  });
});
