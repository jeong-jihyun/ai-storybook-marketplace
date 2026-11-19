// READ-001 구매한 책 읽기 (구매 권한이 있는 사람만 전체 페이지) — 이어 읽기·글자 크기는 3단계
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { LoginPrompt } from '../../components/LoginPrompt';
import { PageReader } from '../../components/PageReader';
import { Screen } from '../../components/Screen';
import { EmptyView, ErrorView, Loading } from '../../components/States';
import { useOwnedPages } from '../../hooks/queries';
import { ApiRequestError } from '../../services/api';
import { useSession } from '../../store/session';
import { colors, type as t } from '../../theme';

export default function ReadScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const loggedIn = useSession((s) => !!s.user);
  const q = useOwnedPages(bookId);

  if (!loggedIn) {
    return (
      <Screen edges={[]}>
        <View style={{ padding: 20 }}>
          <LoginPrompt emoji="🔐" title="로그인하면 읽을 수 있어요" desc="구매한 동화는 로그인한 뒤 내 서재에서 끝까지 읽을 수 있어요." next={`/read/${bookId}`} />
        </View>
      </Screen>
    );
  }
  if (q.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  if (q.isError || !q.data) {
    const locked = q.error instanceof ApiRequestError && q.error.code === 'PURCHASE_REQUIRED';
    return (
      <Screen edges={[]}>
        {locked ? (
          <>
            <EmptyView emoji="🔒" title="구매한 책만 끝까지 읽을 수 있어요" desc="무료 미리보기는 책 소개 화면에서 볼 수 있어요." />
            <View style={{ flexDirection: 'row', padding: 24 }}>
              <Button label="책 소개 보기" onPress={() => router.replace({ pathname: '/book/[id]', params: { id: bookId } })} />
            </View>
          </>
        ) : (
          <ErrorView message={q.error?.message} onRetry={q.refetch} />
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: q.data.title }} />
      <PageReader
        pages={q.data.pages}
        totalPages={q.data.totalPages}
        caption={() => ''}
        endLabel="끝"
        endCard={
          <>
            <Text style={{ fontSize: 56 }}>🌟</Text>
            <Text style={[t.title, { textAlign: 'center' }]}>끝까지 다 읽었어요!</Text>
            <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>재미있었나요? 다른 이야기도 만나 보세요.</Text>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 16 }}>
              <Button label="내 서재로" onPress={() => router.replace('/library')} />
            </View>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
              <Button label="다른 동화 둘러보기" variant="secondary" onPress={() => router.replace('/')} />
            </View>
          </>
        }
      />
    </Screen>
  );
}
