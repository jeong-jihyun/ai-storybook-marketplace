// SCR-003 홈: 추천·인기·신규·카테고리 섹션
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BookSummary } from '@storybook/shared-types';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AgeBadge, Tag } from '../../components/Badges';
import { BookCard, BookRow } from '../../components/BookCard';
import { Cover } from '../../components/Cover';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { ErrorView, Loading } from '../../components/States';
import { useHome } from '../../hooks/queries';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, radius, shadow, space, type as t, won } from '../../theme';

function Rail({ books }: { books: BookSummary[] }) {
  return (
    <FlatList
      horizontal
      data={books}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => <BookCard book={item} width={128} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.lg }}
    />
  );
}

export default function Home() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useHome();
  const cols = useLayout().listColumns;

  if (isLoading) return <Screen><Loading /></Screen>;
  if (isError || !data) return <Screen><ErrorView message={error?.message} onRetry={refetch} /></Screen>;

  const hero = data.recommended[0];
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={t.caption}>AI 동화 스튜디오가 만들고, 사람이 꼼꼼히 검수했어요</Text>
          <Text style={[t.display, { marginTop: 4 }]}>오늘은 어떤 이야기를{'\n'}읽어 볼까요?</Text>
          <Pressable
            onPress={() => router.push('/search')}
            style={styles.search}
            accessibilityRole="search"
            accessibilityLabel="동화책 검색하기"
          >
            <Ionicons name="search" size={20} color={colors.inkMute} />
            <Text style={[t.body, { color: colors.inkMute }]}>제목이나 주인공으로 찾아보세요</Text>
          </Pressable>
        </View>

        {hero ? (
          <Pressable
            onPress={() => router.push(`/book/${hero.id}`)}
            style={({ pressed }) => [styles.hero, shadow, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={`이번 주 추천, ${hero.title}`}
          >
            <View style={{ flex: 1, gap: space.sm }}>
              <Tag label="이번 주 추천" tone="warm" />
              <Text style={[t.title, { fontSize: 21 }]} numberOfLines={2}>
                {hero.title}
              </Text>
              <AgeBadge min={hero.ageMin} max={hero.ageMax} size="md" />
              <Text style={styles.heroPrice}>{won(hero.price)}</Text>
            </View>
            <Cover url={hero.coverUrl} width={118} label={hero.title} />
          </Pressable>
        ) : null}

        <View style={{ paddingHorizontal: space.xl, marginTop: space.lg }}>
          <SubscriptionBanner />
        </View>

        <View style={styles.section}>
          <SectionHeader title="어떤 이야기가 좋아요?" onMore={() => router.push('/categories')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.md }}>
            {data.categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: c.slug } })}
                style={({ pressed }) => [styles.catItem, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel={`${c.name} ${c.bookCount}권`}
              >
                <View style={styles.catCircle}>
                  <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
                </View>
                <Text style={styles.catLabel}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="골라 봤어요" emoji="✨" />
          <Rail books={data.recommended} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="지금 인기 있는 책"
            emoji="🏆"
            onMore={() => router.push({ pathname: '/category/[slug]', params: { slug: 'all', sort: 'popular' } })}
          />
          <View style={{ paddingHorizontal: space.xl, gap: space.md, flexDirection: cols > 1 ? 'row' : 'column', flexWrap: 'wrap' }}>
            {data.popular.slice(0, cols > 1 ? 4 : 3).map((b, i) => (
              <View key={b.id} style={cols > 1 ? { width: '48.8%' } : undefined}>
                <BookRow book={b} rank={i + 1} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="새로 나온 책"
            emoji="🌱"
            onMore={() => router.push({ pathname: '/category/[slug]', params: { slug: 'all', sort: 'latest' } })}
          />
          <Rail books={data.latest} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md },
  search: {
    marginTop: space.lg,
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  hero: {
    marginHorizontal: space.xl,
    marginTop: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  heroPrice: { fontFamily: fonts.title, fontSize: 18, color: colors.primaryText },
  section: { marginTop: space.xxl },
  catItem: { alignItems: 'center', width: 76, gap: 6 },
  catCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontFamily: fonts.title, fontSize: 13, color: colors.ink, textAlign: 'center' },
});
