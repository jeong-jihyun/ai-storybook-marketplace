import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, type as t } from '../theme';

/** 아직 열리지 않은 기능 안내 (누를 수 없는 가짜 버튼을 두지 않기 위함) */
export function ComingSoon({ items }: { items: { emoji: string; title: string; desc: string }[] }) {
  return (
    <View style={{ gap: space.md }}>
      {items.map((it) => (
        <View key={it.title} style={styles.row}>
          <Text style={{ fontSize: 26 }}>{it.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={t.cardTitle}>{it.title}</Text>
            <Text style={t.caption}>{it.desc}</Text>
          </View>
          <Text style={styles.soon}>곧 열려요</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  soon: { fontFamily: fonts.title, fontSize: 12, color: colors.inkMute },
});
