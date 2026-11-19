// SCR-015 마이페이지 · SCR-013 보호자 영역 · SCR-014 고객센터 (2단계에서 로그인과 함께 열림)
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { Screen } from '../../components/Screen';
import { colors, radius, space, type as t } from '../../theme';

export default function My() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
        <Text style={t.display} accessibilityRole="header">마이</Text>
        <View style={styles.card}>
          <Text style={{ fontSize: 40 }}>🧸</Text>
          <View style={{ flex: 1 }}>
            <Text style={t.title}>둘러보기 중이에요</Text>
            <Text style={t.caption}>로그인 없이 동화 목록과 무료 미리보기를 볼 수 있어요.</Text>
          </View>
        </View>
        <Text style={t.section}>보호자 영역</Text>
        <ComingSoon
          items={[
            { emoji: '🔐', title: '보호자 로그인', desc: '이메일 로그인 · 소셜 로그인' },
            { emoji: '👪', title: '보호자 확인', desc: '결제·개인정보 변경은 보호자 확인 후에만' },
            { emoji: '🧾', title: '주문·결제 내역', desc: '구매한 동화와 환불 상태 확인' },
            { emoji: '🧒', title: '아이 독서 프로필', desc: '닉네임·연령대만 최소로 저장' },
          ]}
        />
        <Text style={t.section}>고객센터</Text>
        <ComingSoon items={[{ emoji: '💬', title: '공지·문의·환불 안내', desc: '이용 안내와 1:1 문의' }]} />
        <Text style={[t.caption, { textAlign: 'center' }]}>앱 버전 {Constants.expoConfig?.version ?? '0.1.0'} · 1단계(둘러보기)</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.skySoft },
});
