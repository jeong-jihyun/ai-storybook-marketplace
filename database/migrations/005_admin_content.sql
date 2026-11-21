-- 관리자 콘텐츠 수정: 책마다 낭독 목소리·속도, 그림 움직임 설정. 여러 번 실행해도 안전.
ALTER TABLE books ADD COLUMN IF NOT EXISTS narration_voice VARCHAR(30) NOT NULL DEFAULT 'narrator';
ALTER TABLE books ADD COLUMN IF NOT EXISTS narration_rate SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE books ADD COLUMN IF NOT EXISTS motion JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE book_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_narration_rate_range') THEN
    ALTER TABLE books ADD CONSTRAINT books_narration_rate_range CHECK (narration_rate BETWEEN -30 AND 30);
  END IF;
END $$;

-- (Supabase 전용) 관리자가 올린 그림을 두는 공개 저장 공간. 일반 PostgreSQL 에는 storage 스키마가 없어 건너뛴다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('storybook', 'storybook', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
