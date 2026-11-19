// 구독(월 소장권): 가입 · 상태 · 해지 예약/취소 — 모두 보호자 확인 후
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { LoginPrompt } from '../components/LoginPrompt';
import { Confirm, Notice } from '../components/Notice';
import { useParentGate } from '../components/ParentGate';
import { Screen } from '../components/Screen';
import { ErrorView, Loading } from '../components/States';
import { TestStoreSheet } from '../components/TestStoreSheet';
import { useMySubscription, usePlans } from '../hooks/queries';
import { ApiRequestError, api } from '../services/api';
import { monthDay } from '../services/format';
import { useSession } from '../store/session';
import { colors, fonts, radius, shadow, space, type as t, won } from '../theme';

export default function SubscriptionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const plans = usePlans();
  const mine = useMySubscription();
  const { ask, gate } = useParentGate();
  const [store, setStore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<null | 'started' | 'canceled' | 'resumed'>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const plan = plans.data?.[0];
  const sub = mine.data;
  const refresh = () => qc.invalidateQueries();

  const join = async () => {
    setError(null);
    if (!plan) return;
    if (!(await ask(`${plan.name}(${won(plan.price)}/월)을 시작하려면 보호자 PIN을 눌러 주세요.`))) return;
    setStore(true);
  };

  const onStore = async (r: 'success' | 'cancel' | 'fail') => {
    setStore(false);
    if (!plan || r !== 'success') {
      if (r === 'fail') setError('결제가 완료되지 않았어요. 돈은 나가지 않았어요.');
      return;
    }
    setBusy('구독을 확인하는 중…');
    try {
      const c = await api.subTestCheckout(plan.code, 'success');
      if (c.purchaseToken) await api.subVerify({ provider: 'TEST', productId: c.productId, purchaseToken: c.purchaseToken });
      await refresh();
      setNotice('started');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (cancel: boolean) => {
    setConfirmCancel(false);
    setError(null);
    if (!(await ask(cancel ? '구독을 해지하려면 보호자 PIN을 눌러 주세요.' : '해지를 취소하려면 보호자 PIN을 눌러 주세요.'))) return;
    setBusy(cancel ? '해지 예약 중…' : '다시 이어 가는 중…');
    try {
      await (cancel ? api.subCancel() : api.subResume());
      await refresh();
      setNotice(cancel ? 'canceled' : 'resumed');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (!user) {
    body = <LoginPrompt emoji="🎟️" title="로그인하면 구독할 수 있어요" desc="매달 소장권으로 동화를 골라 평생 소장해요." next="/subscription" />;
  } else if (plans.isLoading || mine.isLoading) {
    return <Screen edges={['bottom']} form><Loading /></Screen>;
  } else if (plans.isError || mine.isError || !plan) {
    return <Screen edges={['bottom']} form><ErrorView message={(plans.error ?? mine.error)?.message} onRetry={() => void refresh()} /></Screen>;
  } else if (sub) {
    const used = sub.plan.creditsPerPeriod - sub.creditsRemaining;
    body = (
      <>
        <View style={[styles.hero, shadow]}>
          <Text style={styles.badge}>{sub.cancelAtPeriodEnd ? '해지 예약됨' : '구독 중'}{sub.provider === 'TEST' ? ' · 테스트' : ''}</Text>
          <Text style={t.title}>🎟️ {sub.plan.name}</Text>
          <Text style={styles.big}>
            소장권 {sub.creditsRemaining}
            <Text style={styles.bigSub}> / {sub.plan.creditsPerPeriod}권 남음</Text>
          </Text>
          <View style={styles.meter} accessibilityLabel={`${sub.plan.creditsPerPeriod}권 중 ${used}권 사용`}>
            {Array.from({ length: sub.plan.creditsPerPeriod }).map((_, i) => (
              <View key={i} style={[styles.slot, i < sub.creditsRemaining && styles.slotOn]} />
            ))}
          </View>
          <Text style={t.caption}>
            {sub.cancelAtPeriodEnd
              ? `${monthDay(sub.currentPeriodEnd)}까지 사용할 수 있고, 그 뒤로는 결제되지 않아요.`
              : `${monthDay(sub.currentPeriodEnd)}에 ${won(sub.plan.price)} 결제되고 소장권 ${sub.plan.creditsPerPeriod}권이 새로 채워져요.`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Button label="소장권으로 책 고르기" onPress={() => router.push('/')} disabled={!sub.creditsRemaining} />
        </View>
        {!sub.creditsRemaining ? <Text style={[t.caption, { textAlign: 'center' }]}>이번 달 소장권을 다 썼어요. {monthDay(sub.currentPeriodEnd)}에 새로 채워져요.</Text> : null}
        <View style={styles.info}>
          <Text style={styles.infoTitle}>알아 두세요</Text>
          <Text style={t.caption}>• 소장권으로 받은 책은 해지해도 내 서재에 계속 남아요.</Text>
          <Text style={t.caption}>• 남은 소장권은 다음 달로 넘어가지 않아요.</Text>
          <Text style={t.caption}>• 해지하면 이번 기간 끝까지는 그대로 쓸 수 있어요.</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {sub.cancelAtPeriodEnd ? (
            <Button label={busy ?? '해지 취소하고 계속 구독'} variant="secondary" onPress={() => void toggle(false)} disabled={!!busy} />
          ) : (
            <Button label={busy ?? '구독 해지'} variant="secondary" onPress={() => setConfirmCancel(true)} disabled={!!busy} />
          )}
        </View>
      </>
    );
  } else {
    body = (
      <>
        <View style={[styles.hero, shadow]}>
          <Text style={styles.badge}>매달 자동 결제 · 언제든 해지</Text>
          <Text style={t.title}>🎟️ {plan.name}</Text>
          <Text style={styles.big}>
            {won(plan.price)}
            <Text style={styles.bigSub}> / 월</Text>
          </Text>
          <Text style={t.body}>{plan.description}</Text>
        </View>
        <View style={styles.perks}>
          <Perk emoji="📚" title={`매달 ${plan.creditsPerPeriod}권 소장`} desc="마음에 드는 동화를 골라 내 서재에 평생 보관" />
          <Perk emoji="💰" title={`한 권에 약 ${won(Math.round(plan.price / plan.creditsPerPeriod / 10) * 10)}`} desc="낱권 가격(2,900~5,900원)보다 알뜰하게" />
          <Perk emoji="🔐" title="보호자 확인" desc="구독·해지·소장권 사용 모두 보호자 PIN으로" />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Button label={busy ?? `보호자 확인 후 ${won(plan.price)}로 시작`} onPress={() => void join()} disabled={!!busy} />
        </View>
        <Text style={[t.caption, { textAlign: 'center' }]}>지금은 테스트 결제라 실제로 돈이 나가지 않아요.</Text>
      </>
    );
  }

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '소장권 구독' }} />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }}>
        {body}
        {error ? <Text style={[t.body, { color: colors.danger, textAlign: 'center' }]} accessibilityLiveRegion="polite">{error}</Text> : null}
      </ScrollView>
      {plan ? <TestStoreSheet visible={store} title={`${plan.name} (1개월)`} amount={plan.price} note="매달 자동 결제 · 언제든 해지할 수 있어요" onResult={(r) => void onStore(r)} /> : null}
      <Confirm
        visible={confirmCancel}
        emoji="🎟️"
        title="구독을 해지할까요?"
        message={sub ? `${monthDay(sub.currentPeriodEnd)}까지는 남은 소장권을 쓸 수 있고, 받은 책은 계속 내 서재에 남아요.` : ''}
        confirmLabel="해지하기"
        onConfirm={() => void toggle(true)}
        onCancel={() => setConfirmCancel(false)}
      />
      <Notice
        visible={notice !== null}
        emoji={notice === 'started' ? '🎉' : notice === 'canceled' ? '👋' : '😊'}
        title={notice === 'started' ? '구독을 시작했어요!' : notice === 'canceled' ? '해지를 예약했어요' : '구독을 계속 이어 가요'}
        message={notice === 'started' ? `소장권 ${plan?.creditsPerPeriod ?? 3}권이 생겼어요.\n마음에 드는 동화에서 ‘소장권으로 받기’를 눌러 주세요.` : notice === 'canceled' ? '이번 기간이 끝나면 더 결제되지 않아요.' : '다음 달에도 소장권이 채워져요.'}
        onClose={() => setNotice(null)}
      />
      {gate}
    </Screen>
  );
}

function Perk({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <View style={styles.perk}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={t.cardTitle}>{title}</Text>
        <Text style={t.caption}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
  badge: { alignSelf: 'flex-start', fontFamily: fonts.title, fontSize: 12, color: '#8A5A00', backgroundColor: colors.sunSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  big: { fontFamily: fonts.title, fontSize: 30, color: colors.primaryText },
  bigSub: { fontFamily: fonts.title, fontSize: 16, color: colors.inkSoft },
  meter: { flexDirection: 'row', gap: space.sm },
  slot: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.line },
  slotOn: { backgroundColor: colors.primary },
  perks: { gap: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  info: { gap: 4, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.skySoft },
  infoTitle: { fontFamily: fonts.title, fontSize: 15, color: '#1F6E99', marginBottom: 2 },
});
