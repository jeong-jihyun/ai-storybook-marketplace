# 동화숲 — AI 생성 동화책 판매 모바일 앱

AI가 만들고 사람이 검수한 어린이 동화책(3~10세)을 검색·미리보기·구매하고, 내 서재에서 읽는 앱입니다.
설계서: [docs/00-design-spec-v1.0.docx](docs/00-design-spec-v1.0.docx)

**현재 단계: 2단계(판매) 완료** — 보호자 가입·로그인, 보호자 PIN, 주문, 테스트 결제 → 서버 검증 → 내 서재, 끝까지 읽기.
결과 보고: [1단계](docs/10-stage1-report.md) · [2단계](docs/11-stage2-report.md) · [구독·가로 화면](docs/12-subscription-landscape.md)

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

### 구독 (월 소장권)
- 월 6,900원 → 매달 소장권 3권. 소장권으로 받은 책은 해지해도 내 서재에 남습니다. 남은 소장권은 다음 달로 넘어가지 않습니다.
- 요금제는 DB `subscription_plans` 표에 있어 가격·권수를 바꿀 수 있습니다.

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

## 읽어주기 (낭독 음성 + 그림 움직임 + 자막) — 1단계

- 읽기 화면(미리보기·구매한 책)의 `▶ 읽어줘요` 버튼으로 시작합니다. 목소리 켜기/끄기, 자막(읽는 문장 형광펜), 속도(0.8/1/1.25배), 그림 움직임 줄이기를 고를 수 있고 설정은 기억됩니다.
- 낭독 음성: `audio/gen.py`가 `apps/api/src/seed/storybooks.json` 본문을 무료 Microsoft edge-tts로 쪽마다 MP3로 만들고, 문장별 자막 시간을 `audio/manifest.json`에 적습니다. GitHub Actions(`.github/workflows/voice.yml`)가 본문이 바뀔 때 자동으로 돌려 `audio/files/`에 올리고 jsDelivr CDN 캐시를 새로 고칩니다. (바뀐 쪽만 다시 만듦)
- 음성이 아직 없으면 `목소리 준비중`으로 표시되고, 소리 없이 그림 움직임·자막만 동작합니다.
- 그림 움직임 엔진: `apps/mobile/src/motion/` — 재생 위치(초)만으로 계산해서 멈추면 멈추고 되감아도 같은 모습입니다. 시험: `pnpm --filter mobile test`
- 로컬에서 음성 흐름만 시험: `python audio/gen.py --mock` (신호음), 검사: `python audio/gen.py --check`

## 관리자 콘텐츠 수정

앱 → 마이 → **동화 관리** (관리자 이메일 계정에만 보임). 글·제목·소개, 가격·공개/비공개·카테고리, 쪽 그림·표지 교체, 쪽 추가·삭제, 낭독 목소리·속도, 그림 움직임(켜기/끄기·카메라·반짝이)을 고칠 수 있고 바로 반영돼요. 모든 변경은 `admin_audit_logs` 에 기록돼요.

| 설정 | 어디에 | 설명 |
| --- | --- | --- |
| `ADMIN_EMAILS` | Vercel 환경변수 | 관리자 이메일(쉼표로 여러 개). 이 이메일로 가입한 계정만 관리자 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel 환경변수 | 올린 그림을 Supabase Storage(`storybook` 공개 버킷)에 저장. 없으면 메모리에만 저장(서버가 꺼지면 사라짐) |
| `NARRATION_TOKEN` | Vercel 환경변수 + GitHub 시크릿(같은 값) | 음성 자동 생성이 `/api/v1/narration/source` 에서 본문을 가져올 때 쓰는 비밀 토큰 |

- DB: `database/migrations/005_admin_content.sql` (목소리·속도·움직임 컬럼, 저장 버킷)
- 음성: GitHub Actions `동화 낭독 음성 만들기` 가 30분마다 서버의 본문·목소리를 가져와 **바뀐 쪽만** 다시 만들어요. 글이 고쳐졌는데 음성이 아직 옛것이면 앱은 그 음성을 쓰지 않고(소리 없이 그림만) 새 음성이 만들어지면 다시 소리가 나요.
- 주의: 이 저장소가 공개라서 `audio/` 의 음성·글은 구매 전에도 주소를 알면 받을 수 있어요(미리보기 쪽 수 제한은 앱·API 기준).
