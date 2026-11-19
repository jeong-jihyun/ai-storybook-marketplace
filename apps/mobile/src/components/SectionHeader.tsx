import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, space, type as t } from '../theme';

export function SectionHeader({ title, emoji, onMore }: { title: string; emoji?: string; onMore?: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={t.section} accessibilityRole="header">
        {emoji ? `${emoji} ` : ''}
        {title}
      </Text>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={12} accessibilityRole="button" accessibilityLabel={`${title} 전체 보기`}>
          <Text style={styles.more}>전체 보기 ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, marginBottom: space.md },
  more: { fontFamily: fonts.title, fontSize: 14, color: colors.primaryText },
});
