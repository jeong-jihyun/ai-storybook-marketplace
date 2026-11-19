# 동화숲 — AI 생성 동화책 판매 모바일 앱

AI가 만들고 사람이 검수한 어린이 동화책(3~10세)을 검색·미리보기·구매하고, 내 서재에서 읽는 앱입니다.
설계서: [docs/00-design-spec-v1.0.docx](docs/00-design-spec-v1.0.docx)

**현재 단계: 2단계(판매) 완료** — 보호자 가입·로그인, 보호자 PIN, 주문, 테스트 결제 → 서버 검증 → 내 서재, 끝까지 읽기.
결과 보고: [1단계](docs/10-stage1-report.md) · [2단계](docs/11-stage2-report.md)

## 구성
```
apps/
  mobile/   React Native (Expo SDK 58, Expo Router) — Android·iOS·웹
  api/      NestJS 11 + TypeORM — /api/v1, Swagger /api/docs
packages/
  shared-types/   앱·서버 공용 응답 타입
database/
  migrations/     설계서 5장 테이블
  seeds/          샘플 동화 10권
api/index.js      Vercel 서버리스 진입점
```

| 영역 | 기술 |
|---|---|
| 모바일 | React Native + TypeScript, Expo Router(React Navigation 기반), TanStack Query, Zustand |
| 백엔드 | NestJS 11, TypeORM, class-validator |
| DB / 캐시 | PostgreSQL 16 / Redis 7 (docker-compose) |
| 배포 | Vercel 무료 (웹 앱 + API 한 주소) |

> NestJS 12는 ESM 전용이라 테스트·서버리스 배포가 불안정해 안정판 11을 씁니다.

## 실행 (Windows PowerShell)
```powershell
# 0) 준비: Node 22 이상, pnpm
npm install -g pnpm
pnpm install

# 1) API 실행 (DB 없이 시드 데이터로) → http://localhost:4000/api/docs
pnpm api:dev

# 2) 앱 실행 (새 창에서) → 표시되는 QR을 폰의 Expo Go로 찍거나, w 키로 웹 열기
$env:EXPO_PUBLIC_API_URL="http://<PC의 내부 IP>:4000"   # 폰에서 볼 때만
pnpm mobile:start
```

### PostgreSQL로 실행
```powershell
docker compose up -d               # 테이블·샘플 데이터 자동 생성
$env:DATABASE_URL="postgres://storybook:storybook@localhost:5432/storybook"
pnpm api:dev
```

### 결제 방식
- 지금은 **테스트 결제**(돈이 나가지 않음)로 주문 → 영수증 → 서버 검증 → 내 서재 흐름 전체가 동작합니다.
- 구글 플레이·애플 검증 코드는 들어 있고, `.env.example` 의 키를 넣으면 켜집니다. 정식 출시 때 `PAYMENT_TEST_MODE=false`.

### 테스트
```powershell
pnpm api:test                                   # 시드 데이터 기준
$env:TEST_DATABASE_URL=$env:DATABASE_URL; pnpm api:test   # PostgreSQL까지 같이
pnpm typecheck
```

### 샘플 그림·시드 다시 만들기
```powershell
pnpm --filter @storybook/api art        # 표지·삽화 PNG (storage/books)
pnpm --filter @storybook/api seed:sql   # database/seeds/001_storybooks.sql
```

## 디자인
"따뜻한 그림책" 디자인 시스템 v1.0 — [docs/09-design-system.md](docs/09-design-system.md)

## 다음 단계 (설계서 10장)
- 3단계 독서: 뷰어, 이어 읽기, 비구매 전체 열람 차단
- 4단계 관리자: 상품 등록·검수·판매 승인 웹
- 5단계 출시 준비
