import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type as t } from '../theme';
import { Button } from './Button';

/** 로그인이 필요한 화면의 안내 상자 */
export function LoginPrompt({ emoji, title, desc, next }: { emoji: string; title: string; desc: string; next: string }) {
  const router = useRouter();
  return (
    <View style={styles.box}>
      <Text style={{ fontSize: 52 }}>{emoji}</Text>
      <Text style={[t.title, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>{desc}</Text>
      <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: space.sm }}>
        <Button label="로그인" onPress={() => router.push({ pathname: '/login', params: { next } })} />
      </View>
      <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
        <Button label="보호자 회원가입" variant="secondary" onPress={() => router.push({ pathname: '/signup', params: { next } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: space.sm, padding: space.xxl, borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
});
