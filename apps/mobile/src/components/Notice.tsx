import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type as t } from '../theme';
import { Button } from './Button';

/** 화면 가운데 안내 상자 (웹에서도 똑같이 보이도록 Alert 대신 사용) */
export function Notice({ visible, emoji, title, message, onClose }: { visible: boolean; emoji: string; title: string; message: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={styles.box} onPress={() => undefined}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[t.title, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[t.body, { textAlign: 'center', color: colors.inkSoft, marginTop: space.sm }]}>{message}</Text>
          <View style={{ flexDirection: 'row', marginTop: space.xl }}>
            <Button label="알겠어요" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  box: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xxl, alignItems: 'stretch' },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: space.sm },
});
