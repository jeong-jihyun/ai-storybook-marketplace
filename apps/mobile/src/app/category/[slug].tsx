// 카테고리·전체·연령별 동화 목록 (정렬 + 무한 스크롤)
import type { BookSort } from '@storybook/shared-types';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { BookRow } from '../../components/BookCard';
import { Chips } from '../../components/Chips';
import { Screen } from '../../components/Screen';
import { EmptyView, ErrorView, Loading } from '../../components/States';
import { isSort, SORT_OPTIONS, useBookList, useCategories } from '../../hooks/queries';
import { useLayout } from '../../hooks/useLayout';
import { colors, space, type as t } from '../../theme';

export default function CategoryList() {
  const params = useLocalSearchParams<{ slug: string; sort?: string; age?: string }>();
  const slug = params.slug ?? 'all';
  const age = params.age ? Number(params.age) : undefined;
  const [sort, setSort] = useState<BookSort>(isSort(params.sort) ? params.sort : 'latest');
  const categories = useCategories();
  const cols = useLayout().listColumns;
  const category = categories.data?.find((c) => c.slug === slug);
  const title = age ? `${age}세에게 딱 맞는 동화` : slug === 'all' ? '모든 동화' : category ? `${category.emoji} ${category.name}` : '동화 목록';

    const query = useBookList(slug === 'all' ? undefined : slug, sort, age);
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title }} />
      <View style={{ paddingTop: space.sm }}>
        <Chips options={SORT_OPTIONS} value={sort} onChange={setSort} />
      </View>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorView message={query.error?.message} onRetry={query.refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap: space.md } : undefined}
          renderItem={({ item }) => <BookRow book={item} half={cols > 1} />}
          contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxxl }}
          ListHeaderComponent={<Text style={[t.caption, { marginBottom: space.xs }]}>모두 {total}권</Text>}
          ListEmptyComponent={<EmptyView emoji="🔍" title="아직 이 조건의 책이 없어요" desc="다른 나이나 주제를 골라 보세요." />}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ marginTop: space.lg }} /> : undefined}
        />
      )}
    </Screen>
  );
}
