// SCR-002 로그인 (보호자 계정)
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { ApiRequestError, api } from '../services/api';
import { safeNext } from '../services/nav';
import { useSession } from '../store/session';
import { colors, fonts, space, type as t } from '../theme';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('이메일과 비밀번호를 입력해 주세요.');
    setBusy(true);
    setError(null);
    try {
      await useSession.getState().setTokens(await api.login(email.trim(), password));
      await qc.invalidateQueries();
      router.replace(safeNext(next) as Href);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '로그인' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🐰</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>보호자 로그인</Text>
          <Text style={[t.caption, { textAlign: 'center', marginTop: -8 }]}>
            {next?.startsWith('/checkout') ? '로그인하면 바로 결제 화면으로 이어져요.' : '구매한 동화는 어느 기기에서든 내 서재에서 볼 수 있어요.'}
          </Text>
          <Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" placeholder="parent@example.com" />
          <Field label="비밀번호" value={password} onChangeText={setPassword} secure textContentType="password" autoComplete="password" onSubmitEditing={submit} returnKeyType="go" />
          {error ? <Text style={[t.body, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text> : null}
          <View style={{ flexDirection: 'row' }}>
            <Button label={busy ? '로그인 중…' : '로그인'} onPress={submit} disabled={busy} />
          </View>
          <Pressable
            onPress={() => router.replace({ pathname: '/signup', params: next ? { next } : {} })}
            style={{ alignSelf: 'center', padding: space.sm }}
            accessibilityRole="link"
          >
            <Text style={{ fontFamily: fonts.title, fontSize: 15, color: colors.primaryText }}>처음이신가요? 보호자 회원가입 ›</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
