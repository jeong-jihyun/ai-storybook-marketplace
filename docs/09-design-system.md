# 디자인 시스템 v1.0 — "따뜻한 그림책"

모든 화면은 `apps/mobile/src/theme/index.ts` 의 값만 사용한다. 화면 파일에 색·크기를 직접 쓰지 않는다.

## 색
| 이름 | 값 | 쓰임 |
|---|---|---|
| bg | `#FFF8EE` | 크림색 종이 바탕 (모든 화면) |
| surface | `#FFFFFF` | 카드·입력창·탭바 |
| surfaceWarm | `#FFF1DE` | 강조 상자(추천, 표지 영역, 빈 서재) |
| primary | `#E8772E` | 주 버튼·선택된 칩 |
| primaryText | `#B5520F` | 흰 바탕 위 가격·링크 글자 |
| sky / skySoft | `#5BB8E8` / `#E3F3FC` | 보조 태그·안내 상자 |
| sun / sunSoft | `#FFD166` / `#FFF4D1` | 연령 배지·별 포인트 |
| ink / inkSoft / inkMute | `#3D2C1E` / `#7A6552` / `#A8937F` | 본문 / 보조 / 흐린 글자 |
| line | `#F0E2CF` | 테두리·구분선 |

## 글꼴
- 제목·버튼·배지: **Jua** (둥근 글꼴)
- 본문·동화 문장: **Gowun Dodum** (부드러운 본문), 동화 본문은 19pt / 줄간격 31

## 모양
- 모서리: 10 / 16 / 24 / 알약(999)
- 간격: 4 · 8 · 12 · 16 · 20 · 24 · 32 (화면 좌우 여백 20)
- 누르는 영역: 최소 48 (아이·보호자 모두 누르기 쉽게)
- 표지 비율 3:4, 페이지 그림 4:3
- 웹에서는 폭 480으로 가운데 정렬 (PC로 열어도 폰 모양)

## 공통 부품 (`src/components`)
Screen · Cover · BookCard / BookRow · AgeBadge / Tag · Button(주/보조) · Chips · SectionHeader · Loading / ErrorView / EmptyView · Notice · ComingSoon

## 규칙
- 아직 안 열린 기능은 누를 수 있는 버튼으로 두지 않고 "곧 열려요"로 표시한다.
- 경고창(Alert) 대신 `Notice` 를 쓴다 (웹·폰 똑같이 보이게).
- 링크로 바로 들어와도 뒤로 가기가 있어야 한다 (앞 화면이 없으면 홈으로).
