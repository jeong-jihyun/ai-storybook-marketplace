// SCR-007 주문 확인: 서버 가격으로 주문 → 보호자 확인 → 결제창 → 서버 검증
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AgeBadge } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Cover } from '../../components/Cover';
import { useParentGate } from '../../components/ParentGate';
import { Screen } from '../../components/Screen';
import { ErrorView, Loading } from '../../components/States';
import { TestStoreSheet } from '../../components/TestStoreSheet';
import { useBookForUser } from '../../hooks/queries';
import { ApiRequestError, api } from '../../services/api';
import { newIdempotencyKey } from '../../services/nav';
import { useSession } from '../../store/session';
import { colors, fonts, radius, shadow, space, type as t, won } from '../../theme';

export default function Checkout() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const loggedIn = useSession((s) => !!s.user);
  const book = useBookForUser(bookId);
  const { ask, gate } = useParentGate();
  const idemKey = useRef(newIdempotencyKey()); // 이 화면에서 결제 버튼을 여러 번 눌러도 주문은 1건
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null);
  const [store, setStore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!loggedIn) return <Redirect href={{ pathname: '/login', params: { next: `/checkout/${bookId}` } }} />;
  if (book.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  if (book.isError || !book.data) return <Screen edges={[]}><ErrorView message={book.error?.message} onRetry={book.refetch} /></Screen>;
  const b = book.data;
  if (b.owned) return <Redirect href={{ pathname: '/read/[bookId]', params: { bookId } }} />;

  const goResult = (orderId: string) => {
    void qc.invalidateQueries();
    router.replace({ pathname: '/checkout/result', params: { orderId, bookId } });
  };

  const pay = async () => {
    setError(null);
    if (!(await ask(`‘${b.title}’을(를) ${won(b.price)}에 사려면 보호자 PIN을 눌러 주세요.`))) return;
    setBusy('주문을 만드는 중…');
    try {
      const o = await api.createOrder([b.id], idemKey.current);
      setOrder({ id: o.id, total: o.totalAmount });
      setStore(true); // 결제창 (지금은 테스트 결제창)
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'ALREADY_OWNED') return goResult('owned');
      setError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  const onStoreResult = async (r: 'success' | 'cancel' | 'fail') => {
    setStore(false);
    if (!order) return;
    setBusy(r === 'success' ? '결제를 확인하는 중…' : '처리하는 중…');
    try {
      const c = await api.testCheckout(order.id, r);
      if (r === 'success' && c.purchaseToken) {
        // 결제 완료는 앱이 아니라 서버 검증 결과로 확정한다
        await api.verifyPayment({ orderId: order.id, provider: 'TEST', productId: c.productId, purchaseToken: c.purchaseToken });
      }
    } catch {
      // 검증 실패도 결과 화면에서 서버 상태로 보여 준다
    } finally {
      setBusy(null);
      idemKey.current = newIdempotencyKey(); // 다음 시도는 새 주문
      goResult(order.id);
    }
  };

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '주문 확인' }} />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl, paddingBottom: 140 }}>
        <View style={[styles.item, shadow]}>
          <Cover url={b.coverUrl} width={84} label={b.title} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={t.cardTitle}>{b.title}</Text>
            <AgeBadge min={b.ageMin} max={b.ageMax} />
            <Text style={t.caption}>전자책 · {b.pageCount}쪽</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Row label="상품 금액" value={won(b.price)} />
          <Row label="할인" value="0원" />
          <View style={styles.line} />
          <Row label="최종 결제 금액" value={won(order?.total ?? b.price)} strong />
          <Text style={t.caption}>금액은 결제 직전에 서버의 현재 판매가로 다시 확인해요.</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>꼭 확인해 주세요</Text>
          <Text style={t.caption}>• 결제는 보호자 PIN 확인 후에만 진행돼요.</Text>
          <Text style={t.caption}>• 전자책은 구매 즉시 내 서재에 담기며, 열람을 시작하면 청약철회가 제한될 수 있어요.</Text>
          <Text style={t.caption}>• 지금은 테스트 결제라 실제로 돈이 나가지 않아요.</Text>
        </View>
        {error ? <Text style={[t.body, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text> : null}
      </ScrollView>

      <View style={styles.bar}>
        <Button label={busy ?? `보호자 확인 후 ${won(b.price)} 결제`} onPress={pay} disabled={!!busy || !b.purchasable} />
      </View>
      <TestStoreSheet visible={store} title={b.title} amount={order?.total ?? b.price} onResult={onStoreResult} />
      {gate}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={strong ? t.cardTitle : t.body}>{label}</Text>
      <Text style={strong ? { fontFamily: fonts.title, fontSize: 22, color: colors.primaryText } : t.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  box: { gap: space.md, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  line: { height: 1, backgroundColor: colors.line },
  notice: { gap: 4, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surfaceWarm },
  noticeTitle: { fontFamily: fonts.title, fontSize: 15, color: colors.primaryText, marginBottom: 2 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: space.xl, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
});
