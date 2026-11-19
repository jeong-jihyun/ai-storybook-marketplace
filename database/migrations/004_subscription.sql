-- 구독(월 소장권): 매달 정해진 권수만큼 책을 골라 내 서재에 영구 소장
-- 요금제는 표에 두고, 가격·권수는 관리자(4단계)에서 바꾼다. 여러 번 실행해도 안전.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),          -- 기간당 금액(원)
  period_days INTEGER NOT NULL DEFAULT 30 CHECK (period_days > 0),
  credits_per_period INTEGER NOT NULL CHECK (credits_per_period > 0), -- 기간마다 받는 소장권 수
  store_product_id VARCHAR(100) UNIQUE,                -- 구글·애플 구독 상품 ID
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED')),
  provider VARCHAR(30) NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  credits_remaining INTEGER NOT NULL CHECK (credits_remaining >= 0),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,  -- 해지 예약 (기간 끝까지는 사용 가능)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 한 사람은 사용 중인 구독을 하나만
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_user ON subscriptions (user_id) WHERE status = 'ACTIVE';

-- 구독 결제(시작·갱신) 기록: 거래번호는 공급자별로 한 번만
CREATE TABLE IF NOT EXISTS subscription_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  provider VARCHAR(30) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, transaction_id)
);

-- 내 서재의 책이 어떻게 들어왔는지 (구매 / 소장권)
ALTER TABLE library ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'PURCHASE';
ALTER TABLE library ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- 기본 요금제: 월 6,900원, 매달 3권
INSERT INTO subscription_plans (code, name, description, price, period_days, credits_per_period, store_product_id, sort_order)
VALUES ('monthly_3', '소장권 구독', '매달 동화 3권을 골라 내 서재에 평생 소장해요.', 6900, 30, 3, 'storybook_sub_monthly_3', 1)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_charges ENABLE ROW LEVEL SECURITY;
