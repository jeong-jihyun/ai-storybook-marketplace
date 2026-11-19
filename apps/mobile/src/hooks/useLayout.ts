import { useWindowDimensions } from 'react-native';
import { MAX_APP_WIDTH, MAX_WIDE_WIDTH, MAX_FORM_WIDTH } from '../theme';

/**
 * 화면 방향·폭에 맞춘 배치 값 (반응형)
 * - 세로: 폰 폭(최대 480)
 * - 가로: 넓게(최대 1100) 쓰고, 목록은 2칸, 읽기·상세는 좌우 배치
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const contentWidth = Math.min(width, landscape ? MAX_WIDE_WIDTH : MAX_APP_WIDTH);
  return {
    width,
    height,
    landscape,
    contentWidth,
    formWidth: Math.min(width, MAX_FORM_WIDTH),
    /** 줄 카드 목록 칸 수 */
    listColumns: landscape && contentWidth >= 640 ? 2 : 1,
    /** 표지 격자 칸 수 (카드 폭 최소 140) */
    gridColumns: (gap: number, pad: number) => Math.max(2, Math.floor((contentWidth - pad * 2 + gap) / (140 + gap))),
  };
}
