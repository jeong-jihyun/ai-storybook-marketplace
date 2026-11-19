-- 자동 생성 파일: pnpm --filter @storybook/api seed:sql
BEGIN;
INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES ('6f1c2a10-0001-4a00-8000-000000000001', 'adventure', '용기와 모험', '씩씩하게 한 걸음 내딛는 이야기', '🧭', 1)
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;
INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES ('6f1c2a10-0001-4a00-8000-000000000002', 'friendship', '우정과 나눔', '함께라서 더 따뜻한 이야기', '🤝', 2)
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;
INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES ('6f1c2a10-0001-4a00-8000-000000000003', 'nature', '자연과 동물', '숲·바다·하늘 친구들의 이야기', '🌿', 3)
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;
INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES ('6f1c2a10-0001-4a00-8000-000000000004', 'bedtime', '잠자리 동화', '포근하게 잠드는 밤의 이야기', '🌙', 4)
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;
INSERT INTO categories (id, slug, name, description, emoji, sort_order) VALUES ('6f1c2a10-0001-4a00-8000-000000000005', 'habits', '생활 습관', '스스로 해내는 즐거운 습관 이야기', '🪥', 5)
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000001', '달빛 기차를 탄 토끼 토리', '잠이 오지 않던 밤, 토끼 토리 앞에 달빛 기차가 멈춰 섰어요. 별 마을을 한 바퀴 돌며 마음이 스르르 편안해지는 잠자리 모험 이야기.', ARRAY['토끼', '기차', '달', '별', '잠']::text[], 'books/b0000001-5b00-4c00-8000-000000000001/cover.png', 4900, 3, 6, 8, 3, 1820, 'PUBLISHED', '2026-10-02T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 1, '보름달이 동그랗게 뜬 밤, 토끼 토리는 이불 속에서 눈만 깜빡깜빡했어요. "오늘은 왜 이렇게 잠이 안 올까?"', 'books/b0000001-5b00-4c00-8000-000000000001/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 2, '그때 창밖에서 "칙칙폭폭" 작은 소리가 들렸어요. 은빛으로 반짝이는 달빛 기차가 토리네 마당에 멈춰 섰지 뭐예요.', 'books/b0000001-5b00-4c00-8000-000000000001/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 3, '"잠이 안 오는 친구, 별 마을로 출발합니다!" 차장 부엉이가 모자를 살짝 들어 인사했어요.', 'books/b0000001-5b00-4c00-8000-000000000001/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 4, '기차는 구름 다리를 건너 하늘 높이 올라갔어요. 창밖으로 별들이 손을 흔들며 "안녕, 토리!" 하고 반겨 주었어요.', 'books/b0000001-5b00-4c00-8000-000000000001/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 5, '별 마을에서는 아기 별들이 하품을 하며 하나둘 불을 끄고 있었어요. "별들도 밤에는 쉬는구나."', 'books/b0000001-5b00-4c00-8000-000000000001/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 6, '토리는 아기 별 하나에게 자장가를 불러 주었어요. 아기 별은 "고마워" 하고 말하며 포근하게 잠들었어요.', 'books/b0000001-5b00-4c00-8000-000000000001/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 7, '돌아오는 기차 안, 토리의 눈꺼풀이 점점 무거워졌어요. 덜컹덜컹 흔들리는 기차가 꼭 요람 같았거든요.', 'books/b0000001-5b00-4c00-8000-000000000001/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000001', 8, '눈을 떠 보니 토리는 제 이불 속이었어요. 창밖 달님이 빙그레 웃으며 속삭였어요. "잘 자, 토리. 내일 또 만나."', 'books/b0000001-5b00-4c00-8000-000000000001/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000001', '6f1c2a10-0001-4a00-8000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000001', '6f1c2a10-0001-4a00-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000002', '구름 우체부 몽실이', '하늘 마을의 막내 우체부 몽실이는 바람에 날아간 편지를 찾아 길을 나서요. 마음을 전하는 일이 얼마나 소중한지 알려 주는 따뜻한 우정 이야기.', ARRAY['구름', '편지', '우체부', '바람', '친구']::text[], 'books/b0000001-5b00-4c00-8000-000000000002/cover.png', 3900, 4, 7, 8, 3, 1340, 'PUBLISHED', '2026-10-09T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 1, '하늘 마을에는 폭신폭신한 구름 우체부들이 살아요. 그중 가장 작은 우체부가 바로 몽실이예요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 2, '어느 날 아침, 몽실이는 커다란 편지 가방을 메고 첫 배달을 나섰어요. "오늘은 혼자서도 잘할 수 있어!"', 'books/b0000001-5b00-4c00-8000-000000000002/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 3, '그런데 휘이잉! 장난꾸러기 바람이 불어와 편지 한 장을 데려가 버렸어요. 받는 사람은 "언덕 위 작은 새"였어요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 4, '몽실이는 편지를 찾아 무지개 언덕까지 둥실둥실 날아갔어요. 길에서 만난 해님이 반짝 길을 비춰 주었어요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 5, '드디어 나뭇가지에 걸린 편지를 찾았어요! 하지만 비에 젖어 글씨가 조금 번져 있었어요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 6, '몽실이는 작은 새에게 솔직하게 말했어요. "미안해, 편지가 조금 젖었어." 작은 새는 괜찮다며 편지를 꼭 안았어요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 7, '편지에는 "보고 싶어, 내 친구야"라고 쓰여 있었어요. 작은 새의 눈이 별처럼 반짝였어요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000002', 8, '그날 밤 몽실이는 생각했어요. ''마음을 전하는 일은 정말 멋진 일이야.'' 내일도 몽실이는 하늘을 날아요.', 'books/b0000001-5b00-4c00-8000-000000000002/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000002', '6f1c2a10-0001-4a00-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000003', '용감한 꼬마 거북 바다', '모래사장에서 태어난 꼬마 거북 바다는 처음으로 넓은 바다를 향해 나아가요. 무서워도 한 걸음씩 나아가는 용기를 배우는 이야기.', ARRAY['거북', '바다', '용기', '파도']::text[], 'books/b0000001-5b00-4c00-8000-000000000003/cover.png', 4900, 4, 8, 8, 3, 1610, 'PUBLISHED', '2026-10-15T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 1, '따뜻한 모래 속에서 "톡!" 하고 알껍데기가 깨졌어요. 꼬마 거북 바다가 세상에 처음 고개를 내밀었어요.', 'books/b0000001-5b00-4c00-8000-000000000003/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 2, '저 멀리 반짝이는 바다가 보였어요. "우와, 저기가 우리 집이래!" 하지만 바다까지는 아주 멀어 보였어요.', 'books/b0000001-5b00-4c00-8000-000000000003/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 3, '철썩철썩 큰 파도 소리에 바다는 몸을 움츠렸어요. "너무 커. 나는 너무 작은데…"', 'books/b0000001-5b00-4c00-8000-000000000003/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 4, '그때 게 아저씨가 집게를 흔들며 말했어요. "한 번에 다 가지 않아도 돼. 한 걸음씩 가면 된단다."', 'books/b0000001-5b00-4c00-8000-000000000003/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 5, '바다는 한 걸음, 또 한 걸음 모래를 밀며 나아갔어요. 뒤를 돌아보니 벌써 이만큼이나 왔어요!', 'books/b0000001-5b00-4c00-8000-000000000003/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 6, '드디어 발끝에 차가운 물이 닿았어요. 파도가 다가와 "어서 와" 하고 바다를 살며시 감싸 주었어요.', 'books/b0000001-5b00-4c00-8000-000000000003/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 7, '바닷속은 알록달록 물고기와 산호로 가득했어요. 바다는 힘차게 앞발을 저으며 헤엄쳤어요.', 'books/b0000001-5b00-4c00-8000-000000000003/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000003', 8, '"무서웠지만 해냈어!" 꼬마 거북 바다는 오늘 아주 큰 용기를 배웠답니다.', 'books/b0000001-5b00-4c00-8000-000000000003/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000003', '6f1c2a10-0001-4a00-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000003', '6f1c2a10-0001-4a00-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000004', '도토리 나눔 대작전', '겨울을 앞두고 도토리를 잔뜩 모은 다람쥐 도도. 배고픈 친구들을 만나며 나누면 더 커지는 기쁨을 알게 되는 이야기.', ARRAY['다람쥐', '도토리', '나눔', '겨울', '숲']::text[], 'books/b0000001-5b00-4c00-8000-000000000004/cover.png', 3900, 3, 6, 8, 3, 1190, 'PUBLISHED', '2026-10-20T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 1, '가을 숲에 도토리가 우수수 떨어졌어요. 다람쥐 도도는 볼이 빵빵해지도록 도토리를 모았어요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 2, '"이만큼이면 겨울 내내 배부르겠지?" 도도의 나무 구멍 창고는 도토리로 꽉 찼어요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 3, '그런데 길에서 만난 아기 고슴도치가 배를 문지르며 말했어요. "나는 아직 하나도 못 모았어."', 'books/b0000001-5b00-4c00-8000-000000000004/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 4, '도도는 잠깐 고민했어요. 그리고 가장 크고 동그란 도토리 세 개를 꺼내 주었어요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 5, '그 모습을 본 숲속 친구들이 하나둘 모였어요. 토끼는 당근을, 곰은 꿀을 들고 왔지요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 6, '"우리 다 같이 겨울 잔치를 열자!" 친구들은 가진 것을 조금씩 모아 큰 식탁을 차렸어요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 7, '나눠 먹는 도토리는 혼자 먹을 때보다 훨씬 달콤했어요. 웃음소리가 숲 가득 퍼졌어요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000004', 8, '도도는 알게 되었어요. 나누면 줄어드는 게 아니라, 기쁨이 더 커진다는 것을요.', 'books/b0000001-5b00-4c00-8000-000000000004/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000004', '6f1c2a10-0001-4a00-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000004', '6f1c2a10-0001-4a00-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000005', '반짝반짝 이 닦기 왕국', '이 닦기가 귀찮은 아기 곰 뭉치가 꿈속에서 ''반짝반짝 왕국''을 여행해요. 양치 습관을 즐겁게 익히는 생활 습관 동화.', ARRAY['양치', '이 닦기', '습관', '곰']::text[], 'books/b0000001-5b00-4c00-8000-000000000005/cover.png', 2900, 3, 5, 8, 2, 2050, 'PUBLISHED', '2026-10-23T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 1, '"이 닦기 싫어!" 아기 곰 뭉치는 칫솔을 쏙 숨기고 이불 속으로 들어갔어요.', 'books/b0000001-5b00-4c00-8000-000000000005/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 2, '그날 밤 꿈속에서 뭉치는 하얗게 반짝이는 성문 앞에 서 있었어요. 여기는 반짝반짝 이 닦기 왕국이래요.', 'books/b0000001-5b00-4c00-8000-000000000005/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 3, '성문지기 칫솔 기사가 말했어요. "충치 괴물들이 이 마을을 어지럽히고 있어요. 도와줄래요?"', 'books/b0000001-5b00-4c00-8000-000000000005/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 4, '뭉치는 칫솔 기사와 함께 위아래로 쓱싹쓱싹, 동글동글 원을 그리며 괴물들을 쫓아냈어요.', 'books/b0000001-5b00-4c00-8000-000000000005/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 5, '구석구석 어금니 뒤에 숨은 괴물도 빠짐없이 찾아냈어요. "안쪽도 꼼꼼히 닦아야 해!"', 'books/b0000001-5b00-4c00-8000-000000000005/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 6, '마지막으로 물을 오물오물 퉤! 하자 왕국 전체가 반짝반짝 빛났어요.', 'books/b0000001-5b00-4c00-8000-000000000005/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 7, '"고마워요, 뭉치 용사님!" 왕국 사람들이 박수를 쳐 주었어요. 뭉치의 어깨가 으쓱 올라갔어요.', 'books/b0000001-5b00-4c00-8000-000000000005/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000005', 8, '아침에 일어난 뭉치는 칫솔부터 찾았어요. "오늘도 쓱싹쓱싹, 반짝반짝!"', 'books/b0000001-5b00-4c00-8000-000000000005/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000005', '6f1c2a10-0001-4a00-8000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000006', '눈사람 포포의 첫 봄', '봄이 오면 녹아 버릴까 걱정하는 눈사람 포포. 계절이 바뀌는 자연의 흐름과 이별 뒤에 오는 새로운 만남을 담은 이야기.', ARRAY['눈사람', '봄', '계절', '눈']::text[], 'books/b0000001-5b00-4c00-8000-000000000006/cover.png', 4900, 5, 9, 8, 3, 870, 'PUBLISHED', '2026-10-28T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 1, '하얀 눈이 펑펑 내린 날, 아이들이 동그란 눈사람을 만들었어요. 이름은 포포였어요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 2, '포포는 매일 아이들과 눈싸움을 하며 즐겁게 지냈어요. 빨간 목도리가 포포의 자랑이었지요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 3, '어느 날 참새가 말했어요. "곧 봄이 와. 봄이 오면 눈은 다 녹는대." 포포는 덜컥 겁이 났어요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 4, '"나도 녹아 버리는 걸까?" 포포는 해님이 뜨지 않기를 바라며 밤하늘에 소원을 빌었어요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 5, '하지만 해님은 날마다 조금씩 따뜻해졌어요. 포포의 몸도 조금씩 작아졌어요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 6, '작아진 포포의 발밑에서 초록 새싹이 고개를 내밀었어요. "포포야, 네 덕분에 목이 촉촉해."', 'books/b0000001-5b00-4c00-8000-000000000006/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 7, '포포는 깨달았어요. 녹은 눈은 사라지는 게 아니라 꽃과 나무를 키우는 물이 된다는 것을요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000006', 8, '봄이 온 언덕에는 빨간 꽃이 활짝 피었어요. 꼭 포포의 빨간 목도리를 닮은 꽃이었어요.', 'books/b0000001-5b00-4c00-8000-000000000006/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000006', '6f1c2a10-0001-4a00-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000007', '별을 세는 부엉이', '밤마다 별을 세다가 늘 숫자를 잊어버리는 아기 부엉이 부부. 천천히 숫자를 세며 마음을 가라앉히는 잠자리 동화.', ARRAY['부엉이', '별', '숫자', '밤', '잠']::text[], 'books/b0000001-5b00-4c00-8000-000000000007/cover.png', 3900, 3, 7, 8, 3, 1450, 'PUBLISHED', '2026-11-02T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 1, '깊은 숲속 커다란 참나무에 아기 부엉이 부부가 살았어요. 부부는 밤하늘 별 세기를 가장 좋아했어요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 2, '"하나, 둘, 셋… 어? 어디까지 셌더라?" 부부는 매일 밤 숫자를 잊어버렸어요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 3, '엄마 부엉이가 다가와 말했어요. "숨을 크게 쉬고, 천천히 세어 보렴."', 'books/b0000001-5b00-4c00-8000-000000000007/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 4, '부부는 숨을 후우 내쉬었어요. "하나… 둘… 셋…" 별 하나에 숫자 하나씩, 아주 천천히요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 5, '"넷… 다섯… 여섯…" 별을 셀수록 바람 소리가 부드럽게 들렸어요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 6, '"일곱… 여덟… 아홉…" 부부의 눈이 스르르 감기기 시작했어요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 7, '"열…" 열 번째 별은 부부의 꿈속에서 반짝였어요. 엄마 부엉이가 날개로 살포시 덮어 주었어요.', 'books/b0000001-5b00-4c00-8000-000000000007/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000007', 8, '오늘 밤 너도 부부처럼 별을 세어 볼래? 하나, 둘, 셋… 잘 자, 우리 아기.', 'books/b0000001-5b00-4c00-8000-000000000007/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000007', '6f1c2a10-0001-4a00-8000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000008', '꿀벌 윙윙이의 정원', '시들어 가는 정원을 살리기 위해 꽃가루를 나르는 꿀벌 윙윙이. 작은 존재가 자연에 얼마나 큰 힘이 되는지 알려 주는 이야기.', ARRAY['꿀벌', '꽃', '정원', '자연']::text[], 'books/b0000001-5b00-4c00-8000-000000000008/cover.png', 3900, 4, 8, 8, 3, 980, 'PUBLISHED', '2026-11-06T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 1, '마을 끝에 오래된 정원이 있었어요. 그런데 올해는 꽃이 잘 피지 않아 정원이 조용했어요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 2, '꿀벌 윙윙이는 고민했어요. "꽃들이 왜 기운이 없을까?" 해님이 대답했어요. "꽃가루를 나눠 줄 친구가 필요해."', 'books/b0000001-5b00-4c00-8000-000000000008/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 3, '윙윙이는 작은 날개를 힘차게 붕붕 흔들며 이 꽃 저 꽃을 날아다녔어요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 4, '노란 꽃가루를 다리에 묻혀 빨간 꽃에게, 빨간 꽃가루는 보라 꽃에게 전해 주었지요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 5, '"너무 작은 나 혼자서 될까?" 지친 윙윙이 옆으로 친구 꿀벌들이 하나둘 날아왔어요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 6, '꿀벌들이 함께 날자 정원에 살랑살랑 바람이 일고, 꽃봉오리가 톡톡 터지기 시작했어요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 7, '며칠 뒤 정원은 알록달록 꽃밭이 되었어요. 나비와 새들도 놀러 왔어요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000008', 8, '윙윙이는 꽃잎 위에서 미소 지었어요. 작은 날갯짓이 정원을 다시 살려 낸 거예요.', 'books/b0000001-5b00-4c00-8000-000000000008/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000008', '6f1c2a10-0001-4a00-8000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000009', '무지개 다리 너머', '비 그친 오후, 여우 소녀 루루는 무지개 끝을 찾아 모험을 떠나요. 일곱 빛깔 마을에서 저마다 다른 친구들을 만나며 다름의 아름다움을 배우는 이야기.', ARRAY['무지개', '여우', '모험', '색깔', '다름']::text[], 'books/b0000001-5b00-4c00-8000-000000000009/cover.png', 5900, 6, 10, 8, 3, 760, 'PUBLISHED', '2026-11-10T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 1, '비가 그친 오후, 하늘에 커다란 무지개가 걸렸어요. 여우 소녀 루루는 무지개 끝이 어디인지 궁금했어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 2, '"무지개 끝에는 무엇이 있을까?" 루루는 작은 가방을 메고 언덕 너머로 달려갔어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 3, '처음 도착한 빨강 마을에서는 모두가 빠르게 뛰어다녔어요. 루루도 신나게 함께 달렸어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 4, '노랑 마을 친구들은 노래를 좋아했고, 초록 마을 친구들은 조용히 식물을 가꾸었어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 5, '파랑 마을에서 루루는 물었어요. "왜 마을마다 이렇게 다를까?" 거북 할아버지가 웃으며 말했어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 6, '"색이 하나뿐이라면 무지개가 될 수 없단다. 달라서 함께 빛나는 거야."', 'books/b0000001-5b00-4c00-8000-000000000009/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 7, '보라 마을을 지나자 무지개 끝에 닿았어요. 그곳에는 일곱 마을 친구들이 모두 모여 손을 잡고 있었어요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000009', 8, '루루도 손을 내밀었어요. 그 순간 무지개가 한 뼘 더 길어졌어요. 루루의 주황빛이 더해졌거든요.', 'books/b0000001-5b00-4c00-8000-000000000009/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000009', '6f1c2a10-0001-4a00-8000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000009', '6f1c2a10-0001-4a00-8000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO books (id, title, description, keywords, cover_image_key, price, age_min, age_max, page_count, preview_pages, sales_count, status, published_at)
  VALUES ('b0000001-5b00-4c00-8000-000000000010', '혼자서도 척척 곰돌이', '유치원에 가기 전 혼자서 옷 입기, 신발 신기, 가방 챙기기에 도전하는 곰돌이 토토. 스스로 해내는 뿌듯함을 느끼는 생활 습관 동화.', ARRAY['곰', '혼자서', '습관', '유치원', '옷 입기']::text[], 'books/b0000001-5b00-4c00-8000-000000000010/cover.png', 2900, 3, 6, 8, 2, 1120, 'PUBLISHED', '2026-11-14T09:00:00+09:00')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords, cover_image_key = EXCLUDED.cover_image_key,
    price = EXCLUDED.price, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max, page_count = EXCLUDED.page_count, preview_pages = EXCLUDED.preview_pages,
    sales_count = EXCLUDED.sales_count, status = EXCLUDED.status, published_at = EXCLUDED.published_at, updated_at = NOW();
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 1, '따르릉! 아침 알람이 울렸어요. 곰돌이 토토는 오늘 아주 큰 결심을 했어요. "오늘은 혼자서 해 볼 거야!"', 'books/b0000001-5b00-4c00-8000-000000000010/page-01.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 2, '먼저 옷 입기에 도전! 머리를 쏙, 팔을 쏙쏙. 앗, 앞뒤가 바뀌었네? 토토는 다시 천천히 입었어요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-02.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 3, '다음은 양말 신기. 발가락을 쏙 넣고 쭈욱 당겼어요. 짝짝이 양말이지만 그래도 괜찮아요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-03.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 4, '신발은 오른쪽, 왼쪽을 잘 보고 신었어요. 찍찍이도 꾹 눌러 붙였지요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-04.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 5, '가방에는 물병, 손수건, 그림책을 하나씩 넣었어요. "빠진 거 없나?" 토토는 손가락으로 세어 보았어요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-05.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 6, '엄마가 깜짝 놀라며 말했어요. "우와, 토토가 혼자서 다 했네!" 토토는 볼이 발그레해졌어요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-06.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 7, '유치원 가는 길, 토토의 발걸음은 깡충깡충 가벼웠어요. 스스로 해낸 아침은 참 상쾌했거든요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-07.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_pages (book_id, page_number, content, image_key) VALUES ('b0000001-5b00-4c00-8000-000000000010', 8, '"내일은 단추 잠그기에 도전해야지!" 혼자서도 척척 곰돌이 토토의 도전은 계속돼요.', 'books/b0000001-5b00-4c00-8000-000000000010/page-08.png')
  ON CONFLICT (book_id, page_number) DO UPDATE SET content = EXCLUDED.content, image_key = EXCLUDED.image_key;
INSERT INTO book_categories (book_id, category_id) VALUES ('b0000001-5b00-4c00-8000-000000000010', '6f1c2a10-0001-4a00-8000-000000000005') ON CONFLICT DO NOTHING;
COMMIT;
