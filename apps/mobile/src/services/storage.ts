import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 로그인 토큰 보관: 폰은 기기 보안 저장소(키체인/키스토어), 웹은 브라우저 저장소
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string | null) {
    try {
      if (Platform.OS === 'web') {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } else if (value === null) await SecureStore.deleteItemAsync(key);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      // 저장 실패해도 앱은 계속 (다음 실행 때 다시 로그인)
    }
  },
};
