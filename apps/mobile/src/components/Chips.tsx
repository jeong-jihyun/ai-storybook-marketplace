import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, space } from '../theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/** 정렬·필터 선택 칩 (하나만 선택) */
export function Chips<T extends string>({ options, value, onChange }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on ? styles.on : styles.off]}
          >
            <Text style={[styles.text, { color: on ? colors.white : colors.inkSoft }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: space.sm, alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xs },
  chip: { minHeight: 38, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1.5 },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  off: { backgroundColor: colors.surface, borderColor: colors.line },
  text: { fontFamily: fonts.title, fontSize: 14 },
});
