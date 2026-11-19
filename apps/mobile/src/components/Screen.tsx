import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useLayout } from '../hooks/useLayout';
import { colors } from '../theme';

/**
 * 모든 화면의 바깥 틀: 크림색 바탕 + 안전 영역 + 화면 방향에 맞춘 폭
 * - form: 입력 화면은 가로에서도 적당한 폭으로
 */
export function Screen({ children, edges = ['top'], form }: { children: ReactNode; edges?: Edge[]; form?: boolean }) {
  const { landscape, contentWidth, formWidth } = useLayout();
  // 가로일 때는 노치가 옆에 오므로 좌우 안전 영역도 지킨다
  const safeEdges: Edge[] = Platform.OS === 'web' ? [] : landscape ? [...new Set<Edge>([...edges, 'left', 'right'])] : edges;
  return (
    <SafeAreaView style={styles.safe} edges={safeEdges}>
      <View style={[styles.inner, { maxWidth: form ? formWidth : contentWidth }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, width: '100%', alignSelf: 'center' },
});
