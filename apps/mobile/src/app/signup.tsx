// MEM-001 회원가입 — 보호자(만 19세 이상)만, 보호자 PIN 함께 설정
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Check, Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ApiRequestError, api } from '../services/api';
import { useSession } from '../store/session';
import { colors, radius, space, type as t } from '../theme';
import { safeNext } from '../services/nav';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
const PIN_RE = /^\d{4}$/;
const WEAK_PINS = ['0000', '1111', '1234', '4321', '2222', '3333', '5555', '7777', '9999', '1212'];

export default function Signup() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [f, setF] = useState({ email: '', password: '', password2: '', pin: '', pin2: '', nickname: '' });
  const [agree, setAgree] = useState(false);
  const [parent, setParent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: k.startsWith('pin') ? v.replace(/\D/g, '').slice(0, 4) : v }));

  const errors = {
    email: !EMAIL_RE.test(f.email.trim()) ? '이메일 형식이 맞지 않아요.' : null,
    password: !PW_RE.test(f.password) ? '영문과 숫자를 섞어 8자 이상으로 해 주세요.' : null,
    password2: f.password2 !== f.password ? '비밀번호가 서로 달라요.' : null,
    pin: !PIN_RE.test(f.pin) ? '숫자 4자리로 정해 주세요.' : WEAK_PINS.includes(f.pin) ? '아이가 맞히기 쉬운 숫자예요. 다른 숫자로 해 주세요.' : null,
    pin2: f.pin2 !== f.pin ? 'PIN이 서로 달라요.' : null,
    consent: !agree || !parent ? '두 가지 모두 동의해야 가입할 수 있어요.' : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setServerError(null);
    try {
      const tokens = await api.signup({
        email: f.email.trim(),
        password: f.password,
        parentPin: f.pin,
        nickname: f.nickname.trim() || undefined,
        agreeTerms: true,
        parentConfirmed: true,
      });
      await useSession.getState().setTokens(tokens);
      await qc.invalidateQueries();
      router.replace(safeNext(next) as Href);
    } catch (e) {
      setServerError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: '보호자 회원가입' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Text style={t.cardTitle}>👪 보호자가 가입해 주세요</Text>
            <Text style={t.caption}>아이 정보는 받지 않아요. 결제와 개인정보 변경은 보호자 PIN으로 한 번 더 확인해요.</Text>
          </View>
          <Field label="이메일" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" error={show('email')} />
          <Field label="비밀번호" value={f.password} onChangeText={set('password')} secure autoComplete="new-password" hint="영문+숫자 8자 이상" error={show('password')} />
          <Field label="비밀번호 확인" value={f.password2} onChangeText={set('password2')} secure autoComplete="new-password" error={show('password2')} />
          <Field label="보호자 PIN (숫자 4자리)" value={f.pin} onChangeText={set('pin')} secure keyboardType="number-pad" maxLength={4} hint="결제할 때 눌러요. 아이가 모르는 숫자로 정해 주세요." error={show('pin')} />
          <Field label="보호자 PIN 확인" value={f.pin2} onChangeText={set('pin2')} secure keyboardType="number-pad" maxLength={4} error={show('pin2')} />
          <Field label="닉네임 (선택)" value={f.nickname} onChangeText={set('nickname')} maxLength={30} placeholder="예: 토리맘" />
          <View style={{ gap: 4 }}>
            <Check checked={parent} onChange={setParent} label="만 19세 이상 보호자입니다" />
            <Check checked={agree} onChange={setAgree} label="이용약관과 개인정보 처리방침에 동의합니다" sub="이메일·닉네임만 저장하며, 탈퇴하면 로그인 정보를 지워요." />
            {show('consent') ? <Text style={[t.caption, { color: colors.danger }]}>{errors.consent}</Text> : null}
          </View>
          {serverError ? <Text style={[t.body, { color: colors.danger }]} accessibilityLiveRegion="polite">{serverError}</Text> : null}
          <View style={{ flexDirection: 'row' }}>
            <Button label={busy ? '가입하는 중…' : '가입하기'} onPress={submit} disabled={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.skySoft, borderRadius: radius.md, padding: space.lg, gap: 4 },
});
