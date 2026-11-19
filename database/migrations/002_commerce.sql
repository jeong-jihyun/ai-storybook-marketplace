-- 2단계(판매): 회원 인증·보호자 PIN·주문 멱등성·결제 검증·구매 권한
-- 001_init.sql 다음에 실행한다. 여러 번 실행해도 안전하게 작성.

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;      -- 로그아웃·탈퇴 시 증가 → 기존 토큰 모두 무효
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_fail_count INTEGER NOT NULL DEFAULT 0;     -- 보호자 PIN 연속 실패 횟수
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;                  -- 5회 실패 시 잠금
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_consent_at TIMESTAMPTZ;                 -- 보호자(만 19세 이상) 확인·약관 동의 시각
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- 스토어 상품 ID (구글 플레이·애플 인앱 상품과 1:1)
ALTER TABLE books ADD COLUMN IF NOT EXISTS store_product_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_books_store_product_id ON books (store_product_id) WHERE store_product_id IS NOT NULL;

-- 주문 멱등성 키는 사용자별로 유일 (같은 버튼을 두 번 눌러도 주문 1건)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_user_idempotency ON orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC);

-- 결제: 거래번호는 공급자별로 한 번만 사용 (중복 결제·재사용 방지)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS product_id VARCHAR(100);
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_transaction_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_tx ON payments (provider, transaction_id);

CREATE INDEX IF NOT EXISTS idx_library_user ON library (user_id, purchased_at DESC);
