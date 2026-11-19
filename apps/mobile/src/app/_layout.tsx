import { Jua_400Regular } from '@expo-google-fonts/jua';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { ApiRequestError } from '../services/api';
import { colors, fonts, MIN_TOUCH } from '../theme';

// SCR-001 스플래시: 글꼴·초기 설정이 끝날 때까지 시작 화면을 유지한다.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** 뒤로 가기: 앞 화면이 없으면(링크로 바로 들어온 경우) 홈으로 */
function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      style={{ width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}
      accessibilityRole="button"
      accessibilityLabel="뒤로 가기"
    >
      <Ionicons name="chevron-back" size={28} color={colors.ink} />
    </Pressable>
  );
}

// 4xx(없는 책, 잘못된 요청)는 다시 시도해도 같으므로 재시도하지 않는다
const retry = (count: number, err: unknown) => !(err instanceof ApiRequestError && err.status >= 400 && err.status < 500) && count < 2;

export default function RootLayout() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry, refetchOnWindowFocus: false } } }),
  );
  const [loaded, error] = useFonts({ Jua_400Regular, GowunDodum_400Regular });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <QueryClientProvider client={client}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '홈' }} />
        <Stack.Screen name="book/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="book/[id]/preview" options={{ title: '무료 미리보기' }} />
        <Stack.Screen name="category/[slug]" options={{ title: '' }} />
      </Stack>
    </QueryClientProvider>
  );
}
