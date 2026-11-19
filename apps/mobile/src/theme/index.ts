// 디자인 시스템 v1.0 "따뜻한 그림책" — 모든 화면은 이 값만 사용한다. (화면에 색·크기 직접 쓰지 않기)
// 문서: docs/09-design-system.md
import { Platform } from 'react-native';

export const colors = {
  bg: '#FFF8EE', // 크림색 종이 바탕
  surface: '#FFFFFF',
  surfaceWarm: '#FFF1DE', // 강조 상자 바탕
  primary: '#E8772E', // 주황 (버튼·강조)
  primaryPressed: '#C9611D',
  primaryText: '#B5520F', // 흰 바탕 위 주황 글자 (대비 4.5:1 이상)
  sky: '#5BB8E8', // 하늘색 보조
  skySoft: '#E3F3FC',
  sun: '#FFD166', // 노랑 포인트 (별·배지)
  sunSoft: '#FFF4D1',
  ink: '#3D2C1E', // 본문 글자 (진한 갈색)
  inkSoft: '#7A6552', // 보조 글자
  inkMute: '#A8937F', // 흐린 글자
  line: '#F0E2CF', // 구분선·테두리
  success: '#3E9B4F',
  danger: '#D64545',
  white: '#FFFFFF',
  overlay: 'rgba(61, 44, 30, 0.45)',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const fonts = {
  title: 'Jua_400Regular', // 둥근 제목 글꼴
  body: 'GowunDodum_400Regular', // 부드러운 본문 글꼴
} as const;

export const type = {
  display: { fontFamily: fonts.title, fontSize: 28, lineHeight: 36, color: colors.ink },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 30, color: colors.ink },
  section: { fontFamily: fonts.title, fontSize: 19, lineHeight: 26, color: colors.ink },
  cardTitle: { fontFamily: fonts.title, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.ink },
  story: { fontFamily: fonts.body, fontSize: 19, lineHeight: 31, color: colors.ink },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  button: { fontFamily: fonts.title, fontSize: 18, lineHeight: 24, color: colors.white },
} as const;

export const shadow = Platform.select({
  web: { boxShadow: '0 4px 14px rgba(122, 101, 82, 0.14)' },
  default: { shadowColor: '#7A6552', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
}) as object;

/** 웹에서 PC 화면으로 열어도 폰 크기로 보이게 하는 최대 폭 */
export const MAX_APP_WIDTH = 480;
/** 손가락으로 누르기 쉬운 최소 크기 */
export const MIN_TOUCH = 48;

export const won = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}원`;
export const ageLabel = (min: number, max: number) => `${min}~${max}세`;
