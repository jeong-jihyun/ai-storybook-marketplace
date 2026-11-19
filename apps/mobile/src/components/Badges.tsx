import { StyleSheet, Text, View } from 'react-native';
import { ageLabel, colors, fonts, radius } from '../theme';

export function AgeBadge({ min, max, size = 'sm' }: { min: number; max: number; size?: 'sm' | 'md' }) {
  return (
    <View style={[styles.badge, styles.age, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: '#8A5A00' }, size === 'md' && styles.mdText]}>{ageLabel(min, max)}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'sky' }: { label: string; tone?: 'sky' | 'warm' }) {
  return (
    <View style={[styles.badge, tone === 'sky' ? styles.sky : styles.warm]}>
      <Text style={[styles.text, { color: tone === 'sky' ? '#1F6E99' : colors.primaryText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  age: { backgroundColor: colors.sunSoft },
  sky: { backgroundColor: colors.skySoft },
  warm: { backgroundColor: colors.surfaceWarm },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
  text: { fontFamily: fonts.title, fontSize: 12 },
  mdText: { fontSize: 14 },
});
