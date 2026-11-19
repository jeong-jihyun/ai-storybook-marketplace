// SCR-008 결제 결과: 앱 화면이 아니라 서버의 주문 상태로 결과를 보여 준다
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Cover } from '../../components/Cover';
import { Screen } from '../../components/Screen';
import { ErrorView, Loading } from '../../components/States';
import { useOrder } from '../../hooks/queries';
import { colors, space, type as t, won } from '../../theme';

export default function Result() {
  const { orderId, bookId } = useLocalSearchParams<{ orderId: string; bookId?: string }>();
  const router = useRouter();
  const owned = orderId === 'owned';
  const q = useOrder(owned ? '' : orderId);

  const actions = (primary: [string, () => void], secondary?: [string, () => void]) => (
    <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.lg }}>
      <View style={{ flexDirection: 'row' }}>
        <Button label={primary[0]} onPress={primary[1]} />
      </View>
      {secondary ? (
        <View style={{ flexDirection: 'row' }}>
          <Button label={secondary[0]} variant="secondary" onPress={secondary[1]} />
        </View>
      ) : null}
    </View>
  );
  const read = () => bookId && router.replace({ pathname: '/read/[bookId]', params: { bookId } });
  const retry = () => (bookId ? router.replace({ pathname: '/checkout/[bookId]', params: { bookId } }) : router.replace('/'));

  let body;
  if (owned) {
    body = (
      <>
        <Text style={{ fontSize: 64 }}>📚</Text>
        <Text style={[t.title, { textAlign: 'center' }]}>이미 내 서재에 있는 책이에요</Text>
        {actions(['바로 읽기', read], ['내 서재', () => router.replace('/library')])}
      </>
    );
  } else if (q.isLoading) return <Screen edges={[]}><Loading label="결제 결과를 확인하는 중…" /></Screen>;
  else if (q.isError || !q.data) return <Screen edges={[]}><ErrorView message={q.error?.message} onRetry={q.refetch} /></Screen>;
  else {
    const o = q.data;
    const item = o.items[0];
    const cover = item ? <Cover url={item.book.coverUrl} width={120} label={item.book.title} /> : null;
    if (o.status === 'PAID') {
      body = (
        <>
          <Text style={{ fontSize: 56 }}>🎉</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>내 서재에 담았어요!</Text>
          {cover}
          <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>
            {item?.book.title}
            {'\n'}
            {won(o.totalAmount)} 결제 완료{o.payment?.provider === 'TEST' ? ' (테스트)' : ''}
          </Text>
          {actions(['바로 읽기', read], ['내 서재', () => router.replace('/library')])}
        </>
      );
    } else if (o.status === 'PENDING') {
      body = (
        <>
          <Text style={{ fontSize: 56 }}>⏳</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>결제를 확인하고 있어요</Text>
          <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>스토어 결제가 끝나면 자동으로 내 서재에 담겨요.</Text>
          {actions(['다시 확인', () => void q.refetch()], ['홈으로', () => router.replace('/')])}
        </>
      );
    } else {
      const canceled = o.status === 'CANCELED';
      body = (
        <>
          <Text style={{ fontSize: 56 }}>{canceled ? '🙅' : '😢'}</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>{canceled ? '결제를 취소했어요' : '결제가 완료되지 않았어요'}</Text>
          <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>돈은 나가지 않았어요. 다시 시도할 수 있어요.</Text>
          {cover}
          {actions(['다시 결제하기', retry], ['홈으로', () => router.replace('/')])}
        </>
      );
    }
  }

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '결제 결과', headerLeft: () => null, gestureEnabled: false }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md }}>{body}</View>
    </Screen>
  );
}
