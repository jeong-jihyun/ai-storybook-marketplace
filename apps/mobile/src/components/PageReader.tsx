import Ionicons from '@expo/vector-icons/Ionicons';
import type { BookPage } from '@storybook/shared-types';
import { Image } from 'expo-image';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { resolveAsset } from '../services/api';
import { colors, MIN_TOUCH, radius, space, type as t } from '../theme';

type Item = { kind: 'page'; page: BookPage } | { kind: 'end' };

/**
 * 그림책 넘겨 보기 (미리보기·구매한 책 공통).
 * 손가락으로 옆으로 넘기거나 아래 화살표로 넘긴다. 마지막 장 뒤에 endCard 를 보여 준다.
 */
export function PageReader({ pages, totalPages, caption, endLabel, endCard }: { pages: BookPage[]; totalPages: number; caption: (page: number) => string; endLabel: string; endCard: ReactNode }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Item>>(null);
  const items: Item[] = [...pages.map((page) => ({ kind: 'page' as const, page })), { kind: 'end' }];

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );
  const go = (i: number) => {
    const next = Math.max(0, Math.min(items.length - 1, i));
    listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  };
  const atEnd = index >= items.length - 1;

  return (
    <>
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
                  <View style={styles.end}>{endCard}</View>
                )}
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => go(index - 1)} disabled={index === 0} style={[styles.navBtn, index === 0 && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="이전 쪽">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.dots}>
            {items.map((it, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn, it.kind === 'end' && styles.dotEnd]} />
            ))}
          </View>
          <Text style={t.caption} accessibilityLiveRegion="polite">
            {atEnd ? endLabel : `${index + 1} / ${totalPages}쪽${caption(index + 1)}`}
          </Text>
        </View>
        <Pressable onPress={() => go(index + 1)} disabled={atEnd} style={[styles.navBtn, atEnd && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="다음 쪽">
          <Ionicons name="chevron-forward" size={26} color={colors.ink} />
        </Pressable>
      </View>
    </>
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
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 220 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.primary, width: 20 },
  dotEnd: { backgroundColor: colors.sun },
});
