import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, MIN_TOUCH, radius } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  sub?: string;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', sub, disabled }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? { backgroundColor: colors.primaryPressed } : { backgroundColor: colors.surfaceWarm }),
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: primary ? colors.white : colors.primaryText }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: primary ? '#FFE9D6' : colors.inkSoft }]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TOUCH + 4, borderRadius: radius.lg, justifyContent: 'center', paddingHorizontal: 20, flex: 1 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  label: { fontFamily: fonts.title, fontSize: 18 },
  sub: { fontFamily: fonts.body, fontSize: 13 },
});
