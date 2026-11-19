// BOOK-005 무료 미리보기: 허용된 페이지만 넘겨 보고, 마지막에 구매 안내
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BookPage } from '@storybook/shared-types';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Notice';
import { Screen } from '../../../components/Screen';
import { ErrorView, Loading } from '../../../components/States';
import { useBook, usePreview } from '../../../hooks/queries';
import { resolveAsset } from '../../../services/api';
import { colors, MIN_TOUCH, radius, space, type as t, won } from '../../../theme';

type Item = { kind: 'page'; page: BookPage } | { kind: 'end' };

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const preview = usePreview(id);
  const book = useBook(id);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  if (preview.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  if (preview.isError || !preview.data) return <Screen edges={[]}><ErrorView message={preview.error?.message} onRetry={preview.refetch} /></Screen>;

  const p = preview.data;
  const items: Item[] = [...p.pages.map((page) => ({ kind: 'page' as const, page })), { kind: 'end' }];
  const go = (i: number) => {
    const next = Math.max(0, Math.min(items.length - 1, i));
    listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  };
  const atEnd = index >= items.length - 1;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: book.data?.title ?? '무료 미리보기' }} />
      <View style={{ flex: 1 }} onLayout={onLayout}>
        {width > 0 ? (
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it) => (it.kind === 'page' ? `p${it.page.pageNumber}` : 'end')}
            onScroll={onScroll}
            scrollEventThrottle={32}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <View style={{ width, flex: 1 }}>
                {item.kind === 'page' ? (
                  <ScrollView contentContainerStyle={styles.page}>
                    <Image
                      source={{ uri: resolveAsset(item.page.imageUrl) }}
                      style={[styles.art, { height: ((width - space.xl * 2) * 3) / 4 }]}
                      contentFit="cover"
                      transition={200}
                      accessibilityLabel={`${item.page.pageNumber}쪽 그림`}
                    />
                    <Text style={[t.story, { marginTop: space.xl }]}>{item.page.content}</Text>
                  </ScrollView>
                ) : (
                  <View style={styles.end}>
                    <Text style={{ fontSize: 56 }}>🔒</Text>
                    <Text style={[t.title, { textAlign: 'center' }]}>여기까지 무료로 읽었어요!</Text>
                    <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>
                      뒷이야기 {p.totalPages - p.previewPages}쪽은{'\n'}구매하면 내 서재에서 끝까지 읽을 수 있어요.
                    </Text>
                    <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: space.lg }}>
                      <Button label="구매하기" sub={book.data ? won(book.data.price) : undefined} onPress={() => setNotice(true)} />
                    </View>
                    <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
                      <Button label="책 소개로 돌아가기" variant="secondary" onPress={() => router.back()} />
                    </View>
                  </View>
                )}
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.nav}>
        <Pressable
          onPress={() => go(index - 1)}
          disabled={index === 0}
          style={[styles.navBtn, index === 0 && { opacity: 0.35 }]}
          accessibilityRole="button"
          accessibilityLabel="이전 쪽"
        >
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.dots}>
            {items.map((it, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn, it.kind === 'end' && styles.dotEnd]} />
            ))}
          </View>
          <Text style={t.caption} accessibilityLiveRegion="polite">
            {atEnd ? '미리보기 끝' : `${index + 1} / ${p.totalPages}쪽 · 무료 ${p.previewPages}쪽`}
          </Text>
        </View>
        <Pressable
          onPress={() => go(index + 1)}
          disabled={atEnd}
          style={[styles.navBtn, atEnd && { opacity: 0.35 }]}
          accessibilityRole="button"
          accessibilityLabel="다음 쪽"
        >
          <Ionicons name="chevron-forward" size={26} color={colors.ink} />
        </Pressable>
      </View>

      <Notice
        visible={notice}
        emoji="🛒"
        title="결제는 곧 열려요"
        message={'지금은 1단계(둘러보기) 버전이에요.\n보호자 확인과 스토어 결제는 2단계에서 열려요.'}
        onClose={() => setNotice(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingBottom: space.xxxl },
  art: { width: '100%', borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  navBtn: { width: MIN_TOUCH + 4, height: MIN_TOUCH + 4, borderRadius: radius.pill, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.primary, width: 20 },
  dotEnd: { backgroundColor: colors.sun },
});
