import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, space, type as t } from '../theme';
import { Button } from './Button';

export function Loading({ label = '책장을 넘기는 중…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[t.caption, { marginTop: space.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>🌧️</Text>
      <Text style={[t.section, { textAlign: 'center' }]}>이야기를 불러오지 못했어요</Text>
      <Text style={[t.caption, { textAlign: 'center', marginTop: 6 }]}>{message ?? '잠시 후 다시 시도해 주세요.'}</Text>
      <View style={{ flexDirection: 'row', marginTop: space.xl, width: 200 }}>
        <Button label="다시 시도" onPress={onRetry} />
      </View>
    </View>
  );
}

export function EmptyView({ emoji = '📚', title, desc }: { emoji?: string; title: string; desc?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[t.section, { textAlign: 'center' }]}>{title}</Text>
      {desc ? <Text style={[t.caption, { textAlign: 'center', marginTop: 6 }]}>{desc}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl, minHeight: 260 },
  emoji: { fontSize: 48, marginBottom: space.md },
});
