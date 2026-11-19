// SCR-009 내 서재 (2·3단계에서 구매 도서·이어 읽기 연결)
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ComingSoon } from '../../components/ComingSoon';
import { Screen } from '../../components/Screen';
import { colors, radius, space, type as t } from '../../theme';

export default function Library() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
        <Text style={t.display} accessibilityRole="header">내 서재</Text>
        <View style={styles.empty}>
          <Text style={{ fontSize: 52 }}>📚</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>아직 책장이 비어 있어요</Text>
          <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft }]}>마음에 드는 동화를 구매하면{'\n'}이곳에 차곡차곡 꽂혀요.</Text>
          <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: space.sm }}>
            <Button label="동화 둘러보기" onPress={() => router.push('/')} />
          </View>
        </View>
        <ComingSoon
          items={[
            { emoji: '📖', title: '구매한 책 끝까지 읽기', desc: '구매 권한이 있는 책만 전체 페이지 열람' },
            { emoji: '🔖', title: '이어 읽기', desc: '마지막으로 읽던 쪽부터 다시 시작' },
            { emoji: '💛', title: '찜 목록', desc: '읽고 싶은 책을 모아 두기' },
          ]}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: space.sm, padding: space.xxl, borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
});
