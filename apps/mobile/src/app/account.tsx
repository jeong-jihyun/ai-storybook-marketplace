// 계정 관리 (보호자 영역): 닉네임·비밀번호·보호자 PIN 변경, 회원 탈퇴 — 모두 보호자 확인 후
import { useQueryClient } from '@tanstack/react-query';
import type { AuthTokens, Me } from '@storybook/shared-types';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Confirm, Notice } from '../components/Notice';
import { useParentGate } from '../components/ParentGate';
import { Screen } from '../components/Screen';
import { ApiRequestError, api } from '../services/api';
import { useSession } from '../store/session';
import { colors, radius, space, type as t } from '../theme';

const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export default function Account() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const { ask, gate } = useParentGate();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pin, setPin] = useState({ a: '', b: '' });
  const [msg, setMsg] = useState<{ key: string; text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [done, setDone] = useState(false);

  if (!user && !done) return <Redirect href={{ pathname: '/login', params: { next: '/account' } }} />;

  const run = async (key: string, why: string, fn: () => Promise<void>) => {
    setMsg(null);
    if (!(await ask(why))) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      setMsg({ key, text: e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const apply = async (r: { user: Me } | AuthTokens) => {
    if ('accessToken' in r) await useSession.getState().setTokens(r);
    else useSession.getState().setUser(r.user);
  };

  const saveNickname = () =>
    run('nick', '닉네임을 바꾸려면 보호자 PIN을 눌러 주세요.', async () => {
      await apply(await api.updateMe({ nickname }));
      setMsg({ key: 'nick', text: '닉네임을 바꿨어요.', ok: true });
    });

  const savePassword = () => {
    if (!PW_RE.test(pw.next)) return setMsg({ key: 'pw', text: '새 비밀번호는 영문과 숫자를 섞어 8자 이상으로 해 주세요.', ok: false });
    return run('pw', '비밀번호를 바꾸려면 보호자 PIN을 눌러 주세요.', async () => {
      await apply(await api.updateMe({ currentPassword: pw.current, newPassword: pw.next }));
      setPw({ current: '', next: '' });
      setMsg({ key: 'pw', text: '비밀번호를 바꿨어요. 다른 기기는 로그아웃됐어요.', ok: true });
    });
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(pin.a)) return setMsg({ key: 'pin', text: '새 PIN은 숫자 4자리예요.', ok: false });
    if (pin.a !== pin.b) return setMsg({ key: 'pin', text: '새 PIN이 서로 달라요.', ok: false });
    return run('pin', '지금 쓰는 보호자 PIN을 먼저 눌러 주세요.', async () => {
      await apply(await api.updateMe({ newParentPin: pin.a }));
      setPin({ a: '', b: '' });
      setMsg({ key: 'pin', text: '보호자 PIN을 바꿨어요. 다음 결제부터 새 PIN을 써 주세요.', ok: true });
    });
  };

  const withdraw = () => {
    setConfirmWithdraw(false);
    return run('out', '회원 탈퇴는 보호자 확인이 필요해요.', async () => {
      await api.withdraw();
      setDone(true);
      await useSession.getState().clear();
      qc.clear();
    });
  };

  const note = (key: string) =>
    msg?.key === key ? (
      <Text style={[t.caption, { color: msg.ok ? colors.success : colors.danger }]} accessibilityLiveRegion="polite">
        {msg.text}
      </Text>
    ) : null;

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '계정 관리' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Text style={t.caption}>바꿀 때마다 보호자 PIN으로 한 번 더 확인해요.</Text>
          <Section title="닉네임">
            <Field label="닉네임" value={nickname} onChangeText={setNickname} maxLength={30} />
            {note('nick')}
            <Row><Button label={busy === 'nick' ? '저장 중…' : '닉네임 저장'} variant="secondary" onPress={saveNickname} disabled={!!busy} /></Row>
          </Section>
          <Section title="비밀번호">
            <Field label="지금 비밀번호" value={pw.current} onChangeText={(v) => setPw((s) => ({ ...s, current: v }))} secure autoComplete="password" />
            <Field label="새 비밀번호" value={pw.next} onChangeText={(v) => setPw((s) => ({ ...s, next: v }))} secure autoComplete="new-password" hint="영문+숫자 8자 이상" />
            {note('pw')}
            <Row><Button label={busy === 'pw' ? '바꾸는 중…' : '비밀번호 바꾸기'} variant="secondary" onPress={() => void savePassword()} disabled={!!busy || !pw.current || !pw.next} /></Row>
          </Section>
          <Section title="보호자 PIN">
            <Field label="새 PIN (숫자 4자리)" value={pin.a} onChangeText={(v) => setPin((s) => ({ ...s, a: v.replace(/\D/g, '').slice(0, 4) }))} secure keyboardType="number-pad" maxLength={4} />
            <Field label="새 PIN 확인" value={pin.b} onChangeText={(v) => setPin((s) => ({ ...s, b: v.replace(/\D/g, '').slice(0, 4) }))} secure keyboardType="number-pad" maxLength={4} />
            {note('pin')}
            <Row><Button label={busy === 'pin' ? '바꾸는 중…' : 'PIN 바꾸기'} variant="secondary" onPress={() => void savePin()} disabled={!!busy || !pin.a || !pin.b} /></Row>
          </Section>
          <Section title="회원 탈퇴">
            <Text style={t.caption}>로그인 정보와 PIN을 지우고, 내 서재의 책도 더는 볼 수 없어요. 주문·결제 기록은 법에 따라 개인을 알아볼 수 없게 보관해요.</Text>
            {note('out')}
            <Row><Button label="회원 탈퇴" variant="secondary" onPress={() => setConfirmWithdraw(true)} disabled={!!busy} /></Row>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
      <Confirm
        visible={confirmWithdraw}
        emoji="⚠️"
        title="정말 탈퇴할까요?"
        message="탈퇴하면 되돌릴 수 없고, 구매한 동화도 더는 읽을 수 없어요."
        confirmLabel="탈퇴하기"
        onConfirm={() => void withdraw()}
        onCancel={() => setConfirmWithdraw(false)}
      />
      <Notice visible={done} emoji="👋" title="탈퇴가 끝났어요" message="그동안 동화숲을 이용해 주셔서 고마워요." onClose={() => router.replace('/')} />
      {gate}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={t.section}>{title}</Text>
      {children}
    </View>
  );
}
const Row = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row' }}>{children}</View>;

const styles = StyleSheet.create({
  section: { gap: space.md, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
