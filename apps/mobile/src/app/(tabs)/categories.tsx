// SCR-004 카테고리: 주제별·연령별 분류
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { ErrorView, Loading } from '../../components/States';
import { useCategories } from '../../hooks/queries';
import { colors, fonts, MIN_TOUCH, radius, shadow, space, type as t } from '../../theme';

const AGES = [3, 4, 5, 6, 7, 8, 9, 10];
const TINTS = ['#FFF1DE', '#E3F3FC', '#E6F6E1', '#ECE8FB', '#FFF4D1'];

export default function Categories() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useCategories();
  if (isLoading) return <Screen><Loading /></Screen>;
  if (isError || !data) return <Screen><ErrorView message={error?.message} onRetry={refetch} /></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxxl }}>
        <Text style={t.display} accessibilityRole="header">카테고리</Text>

        <Text style={[t.section, styles.label]}>우리 아이 나이로 찾기</Text>
        <View style={styles.ages}>
          {AGES.map((a) => (
            <Pressable
              key={a}
              onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: 'all', age: String(a) } })}
              style={({ pressed }) => [styles.age, pressed && { backgroundColor: colors.surfaceWarm }]}
              accessibilityRole="button"
              accessibilityLabel={`${a}세에게 맞는 동화`}
            >
              <Text style={styles.ageText}>{a}세</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[t.section, styles.label]}>주제로 찾기</Text>
        <View style={{ gap: space.md }}>
          {data.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: c.slug } })}
              style={({ pressed }) => [styles.card, shadow, { backgroundColor: TINTS[i % TINTS.length] }, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${c.description}, ${c.bookCount}권`}
            >
              <Text style={styles.emoji}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={t.cardTitle}>{c.name}</Text>
                <Text style={t.caption}>{c.description}</Text>
              </View>
              <Text style={styles.count}>{c.bookCount}권 ›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: space.xxl, marginBottom: space.md },
  ages: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  age: {
    minWidth: 64,
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: { fontFamily: fonts.title, fontSize: 16, color: colors.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.lg },
  emoji: { fontSize: 34 },
  count: { fontFamily: fonts.title, fontSize: 15, color: colors.primaryText },
});
