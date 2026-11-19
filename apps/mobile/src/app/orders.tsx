// PAY-005 주문·결제 내역
import type { OrderStatus } from '@storybook/shared-types';
import { Redirect, Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Cover } from '../components/Cover';
import { Screen } from '../components/Screen';
import { EmptyView, ErrorView, Loading } from '../components/States';
import { useOrders } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, radius, space, type as t, won } from '../theme';

const STATUS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PAID: { label: '결제 완료', color: colors.success, bg: '#E6F6E1' },
  PENDING: { label: '결제 확인 중', color: '#8A5A00', bg: colors.sunSoft },
  CANCELED: { label: '취소됨', color: colors.inkSoft, bg: colors.line },
  FAILED: { label: '결제 실패', color: colors.danger, bg: '#FBE4E4' },
};

const date = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function Orders() {
  const router = useRouter();
  const loggedIn = useSession((s) => !!s.user);
  const q = useOrders();
  if (!loggedIn) return <Redirect href={{ pathname: '/login', params: { next: '/orders' } }} />;

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '주문·결제 내역' }} />
      {q.isLoading ? (
        <Loading />
      ) : q.isError || !q.data ? (
        <ErrorView message={q.error?.message} onRetry={q.refetch} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: space.xl, gap: space.md, paddingBottom: space.xxxl }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyView emoji="🧾" title="아직 주문이 없어요" />}
          renderItem={({ item: o }) => {
            const s = STATUS[o.status];
            const it = o.items[0];
            return (
              <Pressable
                onPress={() => it && router.push({ pathname: '/book/[id]', params: { id: it.book.id } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceWarm }]}
                accessibilityRole="button"
                accessibilityLabel={`${it?.book.title}, ${won(o.totalAmount)}, ${s.label}`}
              >
                {it ? <Cover url={it.book.coverUrl} width={56} label={it.book.title} /> : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={t.caption}>{date(o.createdAt)}</Text>
                  <Text style={t.cardTitle} numberOfLines={1}>
                    {it?.book.title}
                    {o.items.length > 1 ? ` 외 ${o.items.length - 1}권` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                    {o.payment?.provider === 'TEST' ? <Text style={t.caption}>테스트 결제</Text> : null}
                  </View>
                </View>
                <Text style={styles.price}>{won(o.totalAmount)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.md, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.title, fontSize: 12 },
  price: { fontFamily: fonts.title, fontSize: 16, color: colors.primaryText },
});
