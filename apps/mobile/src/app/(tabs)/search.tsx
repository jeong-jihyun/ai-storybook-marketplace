// SCR-005 검색: 제목·키워드 검색, 결과 정렬, 최근 검색어
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BookSort } from '@storybook/shared-types';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookRow } from '../../components/BookCard';
import { Chips } from '../../components/Chips';
import { Screen } from '../../components/Screen';
import { EmptyView, ErrorView, Loading } from '../../components/States';
import { SORT_OPTIONS, useSearch } from '../../hooks/queries';
import { useDebounced } from '../../hooks/useDebounced';
import { useRecentSearch } from '../../store/recent-search';
import { useLayout } from '../../hooks/useLayout';
import { colors, fonts, MIN_TOUCH, radius, space, type as t } from '../../theme';

const SUGGESTIONS = ['토끼', '바다', '잠', '친구', '양치', '무지개'];

export default function Search() {
  const [text, setText] = useState('');
  const [sort, setSort] = useState<BookSort>('popular');
  const term = useDebounced(text.trim(), 300);
  const { data, isFetching, isError, error, refetch } = useSearch(term, sort);
  const recent = useRecentSearch();
  const cols = useLayout().listColumns;
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // 결과가 나온 검색어는 최근 검색어에 남긴다
  useEffect(() => {
    if (term && data && data.total > 0) recent.add(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, data?.total]);

  const pick = (w: string) => {
    setText(w);
    Keyboard.dismiss();
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={t.display} accessibilityRole="header">검색</Text>
        <View style={styles.box}>
          <Ionicons name="search" size={20} color={colors.inkMute} />
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="제목, 주인공, 주제로 찾아보세요"
            placeholderTextColor={colors.inkMute}
            style={styles.input}
            returnKeyType="search"
            maxLength={50}
            autoCorrect={false}
            accessibilityLabel="검색어 입력"
          />
          {text ? (
            <Pressable onPress={() => { setText(''); inputRef.current?.focus(); }} hitSlop={12} accessibilityLabel="검색어 지우기">
              <Ionicons name="close-circle" size={22} color={colors.inkMute} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!term ? (
        <View style={{ paddingHorizontal: space.xl }}>
          {recent.terms.length ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={t.section}>최근 검색어</Text>
                <Pressable onPress={recent.clear} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.link}>모두 지우기</Text>
                </Pressable>
              </View>
              <View style={styles.wrap}>
                {recent.terms.map((w) => (
                  <View key={w} style={styles.pill}>
                    <Pressable onPress={() => pick(w)} accessibilityRole="button" accessibilityLabel={`${w} 다시 검색`}>
                      <Text style={styles.pillText}>{w}</Text>
                    </Pressable>
                    <Pressable onPress={() => recent.remove(w)} hitSlop={10} accessibilityLabel={`${w} 삭제`}>
                      <Ionicons name="close" size={16} color={colors.inkMute} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          <Text style={[t.section, { marginTop: space.xl }]}>이런 단어로 찾아보세요</Text>
          <View style={styles.wrap}>
            {SUGGESTIONS.map((w) => (
              <Pressable key={w} onPress={() => pick(w)} style={[styles.pill, styles.suggest]} accessibilityRole="button">
                <Text style={[styles.pillText, { color: colors.primaryText }]}># {w}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : isError ? (
        <ErrorView message={error?.message} onRetry={refetch} />
      ) : !data ? (
        <Loading label="찾는 중…" />
      ) : (
        <>
          <Chips options={SORT_OPTIONS} value={sort} onChange={setSort} />
          <FlatList
            data={data.items}
            keyExtractor={(b) => b.id}
            key={cols}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap: space.md } : undefined}
          renderItem={({ item }) => <BookRow book={item} half={cols > 1} />}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxxl }}
            ListHeaderComponent={
              <Text style={[t.caption, { marginBottom: space.xs }]} accessibilityLiveRegion="polite">
                ‘{term}’ 검색 결과 {data.total}권{isFetching ? ' · 새로 찾는 중…' : ''}
              </Text>
            }
            ListEmptyComponent={<EmptyView emoji="🔍" title={`‘${term}’ 이야기는 아직 없어요`} desc="다른 단어로 찾아보거나 카테고리를 둘러보세요." />}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.lg },
  box: {
    marginTop: space.lg,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 10, outlineStyle: 'none' } as object,
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontFamily: fonts.title, fontSize: 13, color: colors.inkSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  suggest: { backgroundColor: colors.surfaceWarm, borderColor: colors.surfaceWarm, minHeight: MIN_TOUCH - 6 },
  pillText: { fontFamily: fonts.title, fontSize: 14, color: colors.ink },
});
