// BOOK-005 무료 미리보기: 허용된 페이지만 넘겨 보고, 마지막에 구매 안내
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { PageReader } from '../../../components/PageReader';
import { Screen } from '../../../components/Screen';
import { ErrorView, Loading } from '../../../components/States';
import { useBookForUser, usePreview } from '../../../hooks/queries';
import { colors, type as t, won } from '../../../theme';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const preview = usePreview(id);
  const book = useBookForUser(id);

  if (preview.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  if (preview.isError || !preview.data) return <Screen edges={[]}><ErrorView message={preview.error?.message} onRetry={preview.refetch} /></Screen>;
  const p = preview.data;
  const owned = !!book.data?.owned;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: book.data?.title ?? '무료 미리보기' }} />
      <PageReader
        pages={p.pages}
        totalPages={p.totalPages}
        caption={() => ` · 무료 ${p.previewPages}쪽`}
        endLabel="미리보기 끝"
        endCard={
          <>
            <Text style={{ fontSize: 56 }}>{owned ? '📖' : '🔒'}</Text>
            <Text style={[t.title, { textAlign: 'center' }]}>여기까지 무료로 읽었어요!</Text>
            <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>
              {owned ? '이미 산 책이에요. 내 서재에서 끝까지 읽어 보세요.' : `뒷이야기 ${p.totalPages - p.previewPages}쪽은\n구매하면 내 서재에서 끝까지 읽을 수 있어요.`}
            </Text>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 16 }}>
              {owned ? (
                <Button label="끝까지 읽기" onPress={() => router.replace({ pathname: '/read/[bookId]', params: { bookId: id } })} />
              ) : (
                <Button label="구매하기" sub={book.data ? won(book.data.price) : undefined} onPress={() => router.push({ pathname: '/checkout/[bookId]', params: { bookId: id } })} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
              <Button label="책 소개로 돌아가기" variant="secondary" onPress={() => router.back()} />
            </View>
          </>
        }
      />
    </Screen>
  );
}
