-- 모든 테이블 행 단위 보안(RLS) 켜기 — 정책은 만들지 않는다.
-- Supabase 는 public 테이블을 웹 API(PostgREST)로 열어 두므로, 이걸 켜야 외부에서 회원·주문 정보를 읽을 수 없다.
-- 우리 API 서버는 DB 소유자 계정으로 직접 접속하므로 영향이 없다. 일반 PostgreSQL 에서도 해롭지 않다.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'child_profiles', 'categories', 'books', 'book_pages', 'book_assets', 'book_categories',
    'orders', 'order_items', 'payments', 'library', 'reading_progress', 'wishlists', 'reviews',
    'ai_generation_jobs', 'content_reviews', 'refunds', 'admin_audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
