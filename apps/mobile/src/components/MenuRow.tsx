import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, MIN_TOUCH, radius, space, type as t } from '../theme';

export function MenuRow({ emoji, title, desc, onPress, danger }: { emoji: string; title: string; desc?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceWarm }]} accessibilityRole="button" accessibilityLabel={title}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[t.cardTitle, danger && { color: colors.danger }]}>{title}</Text>
        {desc ? <Text style={t.caption}>{desc}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.inkMute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: MIN_TOUCH + 12, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
