// SCR-006 동화책 상세: 표지, 소개, 권장 연령, 페이지 수, 미리보기, 가격
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AgeBadge, Tag } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { Cover } from '../../../components/Cover';
import { Screen } from '../../../components/Screen';
import { ErrorView, Loading } from '../../../components/States';
import { useBookForUser, useMySubscription, usePreview } from '../../../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Notice } from '../../../components/Notice';
import { useParentGate } from '../../../components/ParentGate';
import { SubscriptionBanner } from '../../../components/SubscriptionBanner';
import { ApiRequestError, api } from '../../../services/api';
import { useLayout } from '../../../hooks/useLayout';
import { resolveAsset } from '../../../services/api';
import { colors, fonts, radius, shadow, space, type as t, won } from '../../../theme';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { landscape, height } = useLayout();
  const qc = useQueryClient();
  const sub = useMySubscription();
  const { ask, gate } = useParentGate();
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const book = useBookForUser(id);
  const preview = usePreview(id);

  if (book.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  if (book.isError || !book.data) {
    const notFound = (book.error as { status?: number } | null)?.status === 404 || (book.error as { status?: number } | null)?.status === 400;
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: '' }} />
        {notFound ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: space.xxl }}>
            <Text style={[t.title, { textAlign: 'center' }]}>📕 지금은 볼 수 없는 책이에요</Text>
            <Text style={[t.caption, { textAlign: 'center', marginVertical: space.md }]}>판매가 끝났거나 주소가 잘못되었어요.</Text>
            <View style={{ flexDirection: 'row' }}>
              <Button label="홈으로 가기" onPress={() => router.replace('/')} />
            </View>
          </View>
        ) : (
          <ErrorView message={book.error?.message} onRetry={book.refetch} />
        )}
      </Screen>
    );
  }

  const b = book.data;
  const openPreview = () => router.push({ pathname: '/book/[id]/preview', params: { id: b.id } });

  const credits = sub.data?.creditsRemaining ?? 0;
  const redeem = async () => {
    if (!(await ask(`소장권 1권으로 ‘${b.title}’을(를) 받으려면 보호자 PIN을 눌러 주세요.`))) return;
    setRedeeming(true);
    try {
      const r = await api.redeem(b.id);
      await qc.invalidateQueries();
      setMsg({ ok: true, text: `내 서재에 담았어요! 남은 소장권 ${r.creditsRemaining}권` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.' });
    } finally {
      setRedeeming(false);
    }
  };

  const info = (
    <View style={styles.body}>
        <View style={styles.tags}>
          {b.categories.map((c) => (
            <Tag key={c.id} label={c.name} />
          ))}
        </View>
        <Text style={[t.display, { fontSize: 26 }]} accessibilityRole="header">
          {b.title}
        </Text>

        <View style={[styles.facts, shadow]}>
          <Fact label="권장 연령" value={`${b.ageMin}~${b.ageMax}세`} />
          <View style={styles.divider} />
          <Fact label="분량" value={`${b.pageCount}쪽`} />
          <View style={styles.divider} />
          <Fact label="무료 미리보기" value={`${b.previewPages}쪽`} />
        </View>

        <Text style={[t.section, styles.h]}>이런 이야기예요</Text>
        <Text style={t.body}>{b.description}</Text>

        <View style={[styles.tags, { marginTop: space.md }]}>
          {b.keywords.map((k) => (
            <Text key={k} style={styles.keyword}>
              #{k}
            </Text>
          ))}
        </View>

        <View style={styles.previewHead}>
          <Text style={t.section}>미리 펼쳐 보기</Text>
          <AgeBadge min={b.ageMin} max={b.ageMax} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
          {(preview.data?.pages ?? []).map((p) => (
            <Pressable key={p.pageNumber} onPress={openPreview} accessibilityRole="button" accessibilityLabel={`${p.pageNumber}쪽 미리보기 열기`}>
              <Image source={{ uri: resolveAsset(p.imageUrl) }} style={styles.thumb} contentFit="cover" transition={150} />
              <Text style={[t.caption, { marginTop: 4 }]}>{p.pageNumber}쪽</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.trust}>
          <Text style={styles.trustTitle}>🛡️ 안심하고 읽어요</Text>
          <Text style={t.caption}>AI로 만든 원고와 그림을 사람이 직접 읽고, 아이에게 맞지 않는 표현이 없는지 검수한 뒤 판매해요.</Text>
        </View>
        {!b.owned ? (
          <View style={{ marginTop: space.lg }}>
            <SubscriptionBanner compact />
          </View>
        ) : null}
      </View>
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: b.title }} />
      {landscape ? (
        // 가로: 표지 왼쪽 · 설명 오른쪽
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={[styles.coverArea, styles.coverSide]}>
            <Cover url={b.coverUrl} width={Math.min(220, (height - 220) * 0.75)} label={b.title} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
            {info}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.coverArea}>
            <Cover url={b.coverUrl} width={190} label={b.title} />
          </View>
          {info}
        </ScrollView>
      )}

      <View style={styles.bar}>
        {b.owned || credits === 0 ? (
          <View>
            <Text style={t.caption}>{b.owned ? '내 서재' : '가격'}</Text>
            <Text style={styles.price}>{b.owned ? '내 책' : won(b.price)}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          {b.owned ? (
            <Button label="📖 끝까지 읽기" onPress={() => router.push({ pathname: '/read/[bookId]', params: { bookId: b.id } })} />
          ) : credits > 0 ? (
            <>
              <Button label={`${won(b.price)} 구매`} variant="secondary" onPress={() => router.push({ pathname: '/checkout/[bookId]', params: { bookId: b.id } })} disabled={!b.purchasable} />
              <Button label={redeeming ? '받는 중…' : '🎟️ 소장권 받기'} onPress={() => void redeem()} disabled={redeeming} />
            </>
          ) : (
            <>
              <Button label="미리보기" variant="secondary" onPress={openPreview} />
              <Button label="구매하기" onPress={() => router.push({ pathname: '/checkout/[bookId]', params: { bookId: b.id } })} disabled={!b.purchasable} />
            </>
          )}
        </View>
      </View>
      <Notice visible={!!msg} emoji={msg?.ok ? '🎉' : '😢'} title={msg?.ok ? '소장 완료' : '받지 못했어요'} message={msg?.text ?? ''} onClose={() => setMsg(null)} />
      {gate}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={t.caption}>{label}</Text>
      <Text style={[t.cardTitle, { fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coverSide: { width: '38%', borderBottomLeftRadius: 0, borderTopRightRadius: 36, justifyContent: 'center', paddingVertical: space.lg },
  coverArea: { alignItems: 'center', paddingVertical: space.xxl, backgroundColor: colors.surfaceWarm, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  body: { padding: space.xl, gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  facts: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: space.lg, marginTop: space.md },
  divider: { width: 1, backgroundColor: colors.line },
  h: { marginTop: space.xl },
  keyword: { fontFamily: fonts.body, fontSize: 14, color: '#1F6E99' },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  thumb: { width: 168, height: 126, borderRadius: radius.md, backgroundColor: colors.surfaceWarm },
  trust: { marginTop: space.xl, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.skySoft, gap: 4 },
  trustTitle: { fontFamily: fonts.title, fontSize: 15, color: '#1F6E99' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  price: { fontFamily: fonts.title, fontSize: 22, color: colors.primaryText },
  actions: { flex: 1, flexDirection: 'row', gap: space.sm },
});
