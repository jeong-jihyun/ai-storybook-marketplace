import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, type as t, won } from '../theme';
import { Button } from './Button';

/**
 * 테스트 결제창 — 실제 스토어 결제창(구글·애플) 자리를 대신한다. 돈이 나가지 않는다.
 * 스토어 계정이 연결되면 이 자리에 스토어 결제창이 뜬다.
 */
export function TestStoreSheet({ visible, title, amount, note, onResult }: { visible: boolean; title: string; amount: number; note?: string; onResult: (r: 'success' | 'cancel' | 'fail') => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onResult('cancel')}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>테스트 결제 · 실제로 돈이 나가지 않아요</Text>
          </View>
          <Text style={t.caption}>동화숲 스토어</Text>
          <Text style={t.title} numberOfLines={2}>
            {title}
          </Text>
          {note ? <Text style={t.caption}>{note}</Text> : null}
          <View style={styles.row}>
            <Text style={t.body}>결제 금액</Text>
            <Text style={styles.amount}>{won(amount)}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Button label="결제하기" onPress={() => onResult('success')} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Button label="취소" variant="secondary" onPress={() => onResult('cancel')} />
          </View>
          <Pressable onPress={() => onResult('fail')} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'center', padding: space.sm }}>
            <Text style={[t.caption, { textDecorationLine: 'underline' }]}>결제 실패 상황 시험하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xxl, gap: space.md, paddingBottom: space.xxxl },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.sunSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.title, fontSize: 12, color: '#8A5A00' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  amount: { fontFamily: fonts.title, fontSize: 22, color: colors.primaryText },
});
