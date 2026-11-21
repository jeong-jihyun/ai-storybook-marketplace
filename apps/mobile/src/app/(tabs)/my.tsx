// SCR-015 마이페이지 · SCR-013 보호자 영역 · SCR-014 고객센터
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ComingSoon } from '../../components/ComingSoon';
import { LoginPrompt } from '../../components/LoginPrompt';
import { MenuRow } from '../../components/MenuRow';
import { Notice } from '../../components/Notice';
import { Screen } from '../../components/Screen';
import { api } from '../../services/api';
import { useSession } from '../../store/session';
import { colors, radius, space, type as t } from '../../theme';

export default function My() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const [notice, setNotice] = useState<null | 'restore' | 'logout'>(null);

  // 서버가 아는 최신 내 정보로 맞춘다 (예: 관리자로 지정된 뒤에도 다시 로그인하지 않고 메뉴가 보이게)
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    api.me().then((me) => {
      const cur = useSession.getState().user;
      if (cur && me.id === cur.id && (me.isAdmin ?? false) !== (cur.isAdmin ?? false)) useSession.getState().setUser({ ...cur, ...me });
    }).catch(() => undefined);
  }, [uid]);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // 서버 연결이 안 돼도 이 기기에서는 로그아웃
    }
    await useSession.getState().clear();
    qc.clear();
    setNotice('logout');
  };

  return (
    <Screen form>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: space.xxxl }}>
        <Text style={t.display} accessibilityRole="header">마이</Text>
        {!user ? (
          <LoginPrompt emoji="🧸" title="둘러보기 중이에요" desc="로그인하면 동화를 사고, 내 서재에서 끝까지 읽을 수 있어요." next="/my" />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={{ fontSize: 40 }}>🧸</Text>
              <View style={{ flex: 1 }}>
                <Text style={t.title}>{user.nickname || '보호자'}님</Text>
                <Text style={t.caption}>{user.email}</Text>
              </View>
            </View>
            <Text style={[t.section, { marginTop: space.sm }]}>구매</Text>
            <MenuRow emoji="🎟️" title="소장권 구독" desc="매달 3권 소장 · 남은 소장권 · 해지" onPress={() => router.push('/subscription')} />
            <MenuRow emoji="🧾" title="주문·결제 내역" desc="구매한 동화와 결제 상태" onPress={() => router.push('/orders')} />
            <MenuRow emoji="🔄" title="구매 복구" desc="새 폰·재설치 후 스토어 구매를 다시 불러오기" onPress={() => setNotice('restore')} />
            <Text style={[t.section, { marginTop: space.sm }]}>보호자 영역</Text>
            <MenuRow emoji="🔐" title="계정 관리" desc="닉네임·비밀번호·보호자 PIN 변경, 회원 탈퇴" onPress={() => router.push('/account')} />
            {user.isAdmin ? (
              <>
                <Text style={[t.section, { marginTop: space.sm }]}>관리자</Text>
                <MenuRow emoji="✏️" title="동화 관리" desc="글·그림·가격·공개 여부·목소리·움직임 고치기" onPress={() => router.push('/admin')} />
              </>
            ) : null}
            <MenuRow emoji="👋" title="로그아웃" onPress={() => void logout()} />
          </>
        )}
        <Text style={[t.section, { marginTop: space.sm }]}>곧 열려요</Text>
        <ComingSoon
          items={[
            { emoji: '🧒', title: '아이 독서 프로필', desc: '닉네임·연령대만 최소로 저장' },
            { emoji: '💬', title: '공지·문의·환불 안내', desc: '이용 안내와 1:1 문의' },
          ]}
        />
        <Text style={[t.caption, { textAlign: 'center' }]}>앱 버전 {Constants.expoConfig?.version ?? '0.3.0'} · 구독·가로 화면</Text>
      </ScrollView>
      <Notice
        visible={notice === 'restore'}
        emoji="🔄"
        title="스토어 결제 연결 후 열려요"
        message={'지금은 테스트 결제라 구매 기록이 이미 계정에 저장되어 있어요.\n다른 기기에서도 같은 계정으로 로그인하면 내 서재가 그대로 보여요.'}
        onClose={() => setNotice(null)}
      />
      <Notice visible={notice === 'logout'} emoji="👋" title="로그아웃했어요" message="이 계정의 모든 기기에서 로그아웃됐어요." onClose={() => setNotice(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl, borderRadius: radius.lg, backgroundColor: colors.skySoft },
});
