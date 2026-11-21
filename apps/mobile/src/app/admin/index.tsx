// ADM-001 관리자 · 동화 목록 (모든 상태: 초안·공개·보관)
import type { BookStatus } from '@storybook/shared-types';
import { Redirect, Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Cover } from '../../components/Cover';
import { Screen } from '../../components/Screen';
import { EmptyView, ErrorView, Loading } from '../../components/States';
import { useAdminBooks } from '../../hooks/queries';
import { useSession } from '../../store/session';
import { colors, fonts, radius, space, type as t, won } from '../../theme';

export const ADMIN_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PUBLISHED: { label: '공개 중', color: colors.success, bg: '#E6F6E1' },
  DRAFT: { label: '초안 (숨김)', color: '#8A5A00', bg: colors.sunSoft },
  ARCHIVED: { label: '보관 (판매 중지)', color: colors.inkSoft, bg: colors.line },
};

export default function AdminList() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const q = useAdminBooks();
  if (!user) return <Redirect href={{ pathname: '/login', params: { next: '/admin' } }} />;
  if (!user.isAdmin) return <Redirect href="/my" />;

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '동화 관리' }} />
      {q.isLoading ? (
        <Loading />
      ) : q.isError || !q.data ? (
        <ErrorView message={q.error?.message} onRetry={q.refetch} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxxl }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={<Text style={[t.caption, { marginBottom: space.xs }]}>고칠 동화를 눌러 주세요. 고친 내용은 바로 앱에 반영돼요.</Text>}
          ListEmptyComponent={<EmptyView emoji="📚" title="동화가 아직 없어요" />}
          renderItem={({ item: b }) => {
            const s = ADMIN_STATUS[b.status as BookStatus] ?? ADMIN_STATUS.DRAFT;
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/admin/[id]', params: { id: b.id } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceWarm }]}
                accessibilityRole="button"
                accessibilityLabel={`${b.title}, ${s.label}, ${won(b.price)}`}
              >
                <Cover url={b.coverUrl} width={56} label={b.title} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={t.cardTitle} numberOfLines={2}>{b.title}</Text>
                  <Text style={t.caption}>{won(b.price)} · {b.pageCount}쪽{b.categories.length ? ` · ${b.categories.map((c) => c.name).join(', ')}` : ''}</Text>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.lg, alignItems: 'center', padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.title, fontSize: 12 },
});
