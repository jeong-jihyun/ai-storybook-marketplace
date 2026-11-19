// SCR-009 내 서재: 구매 권한이 있는 책만
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ComingSoon } from '../../components/ComingSoon';
import { Cover } from '../../components/Cover';
import { LoginPrompt } from '../../components/LoginPrompt';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { Screen } from '../../components/Screen';
import { ErrorView, Loading } from '../../components/States';
import { useLibrary } from '../../hooks/queries';
import { useSession } from '../../store/session';
import { useLayout } from '../../hooks/useLayout';
import { colors, radius, space, type as t } from '../../theme';

export default function Library() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const lib = useLibrary();
  const layout = useLayout();
  const cols = layout.gridColumns(space.lg, space.xl);
  const cardW = Math.floor((layout.contentWidth - space.xl * 2 - space.lg * (cols - 1)) / cols);

  if (!user) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
          <Text style={t.display} accessibilityRole="header">내 서재</Text>
          <LoginPrompt emoji="📚" title="로그인하면 내 서재가 열려요" desc="구매한 동화를 어느 기기에서든 끝까지 읽을 수 있어요." next="/library" />
        </ScrollView>
      </Screen>
    );
  }
  if (lib.isLoading) return <Screen><Loading /></Screen>;
  if (lib.isError || !lib.data) return <Screen><ErrorView message={lib.error?.message} onRetry={lib.refetch} /></Screen>;

  return (
    <Screen>
      <FlatList
        data={lib.data}
        keyExtractor={(x) => x.book.id}
        key={cols}
        numColumns={cols}
        columnWrapperStyle={{ gap: space.lg }}
        contentContainerStyle={{ padding: space.xl, gap: space.xl, paddingBottom: space.xxxl }}
        refreshControl={<RefreshControl refreshing={lib.isRefetching} onRefresh={() => void lib.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 4 }}>
            <Text style={t.display} accessibilityRole="header">내 서재</Text>
            <Text style={t.caption}>{lib.data.length ? `내 동화 ${lib.data.length}권` : ''}</Text>
            <View style={{ marginTop: space.sm }}>
              <SubscriptionBanner compact />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/read/[bookId]', params: { bookId: item.book.id } })}
            style={({ pressed }) => [{ width: cardW, gap: 6 }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.book.title} 읽기`}
          >
            <Cover url={item.book.coverUrl} width={cardW} label={item.book.title} />
            <Text style={t.cardTitle} numberOfLines={2}>
              {item.book.title}
            </Text>
            <Text style={[t.caption, { color: colors.primaryText }]}>📖 읽기{item.source === 'SUBSCRIPTION' ? ' · 소장권' : ''}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ gap: space.xl }}>
            <View style={styles.empty}>
              <Text style={{ fontSize: 52 }}>📚</Text>
              <Text style={[t.title, { textAlign: 'center' }]}>아직 책장이 비어 있어요</Text>
              <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>마음에 드는 동화를 구매하면{'\n'}이곳에 차곡차곡 꽂혀요.</Text>
              <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: space.sm }}>
                <Button label="동화 둘러보기" onPress={() => router.push('/')} />
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: space.lg }}>
            <ComingSoon
              items={[
                { emoji: '🔖', title: '이어 읽기', desc: '마지막으로 읽던 쪽부터 다시 시작' },
                { emoji: '💛', title: '찜 목록', desc: '읽고 싶은 책을 모아 두기' },
              ]}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.sm, padding: space.xxl, borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
});
