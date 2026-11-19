import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMySubscription, usePlans } from '../hooks/queries';
import { monthDay } from '../services/format';
import { colors, fonts, radius, space, type as t, won } from '../theme';

/** 구독 안내 띠 — 구독 전: 가입 권유 / 구독 중: 남은 소장권 */
export function SubscriptionBanner({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const plans = usePlans();
  const mine = useMySubscription();
  const plan = plans.data?.[0];
  if (!plan) return null;
  const sub = mine.data;
  const title = sub ? `소장권 ${sub.creditsRemaining}권 남았어요` : `구독하면 매달 ${plan.creditsPerPeriod}권 소장`;
  const desc = sub
    ? sub.creditsRemaining
      ? '마음에 드는 동화에서 ‘소장권으로 받기’를 눌러요'
      : `${monthDay(sub.currentPeriodEnd)}에 새로 채워져요`
    : `월 ${won(plan.price)} · 한 권에 약 ${won(Math.round(plan.price / plan.creditsPerPeriod / 10) * 10)}`;
  return (
    <Pressable
      onPress={() => router.push('/subscription')}
      style={({ pressed }) => [styles.box, compact && styles.compact, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${desc}`}
    >
      <Text style={{ fontSize: compact ? 22 : 28 }}>🎟️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={t.caption} numberOfLines={1}>
          {desc}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.sunSoft, borderWidth: 1.5, borderColor: '#F7DE8E' },
  compact: { paddingVertical: space.md, borderRadius: radius.md },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.ink },
});
