import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiRequestError, api } from '../services/api';
import { useSession } from '../store/session';
import { colors, fonts, radius, space, type as t } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * 보호자 확인 (SCR-013 / MEM-004): 결제·정보 변경 전에 보호자 PIN 4자리.
 * const { ask, gate } = useParentGate();  const ok = await ask('결제하려면…');  {gate}
 * 10분 안에 이미 확인했으면 다시 묻지 않는다.
 */
export function useParentGate() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState('');
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback((why: string) => {
    if (useSession.getState().validParentToken()) return Promise.resolve(true);
    setReason(why);
    setVisible(true);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const finish = (ok: boolean) => {
    setVisible(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  return { ask, gate: <PinPad visible={visible} reason={reason} onDone={finish} /> };
}

function PinPad({ visible, reason, onDone }: { visible: boolean; reason: string; onDone: (ok: boolean) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    setBusy(true);
    try {
      const r = await api.verifyParent(value);
      useSession.getState().setParent(r.parentToken, r.expiresIn);
      setPin('');
      setError(null);
      onDone(true);
    } catch (e) {
      setPin('');
      setError(e instanceof ApiRequestError ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const press = (k: string) => {
    if (busy) return;
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (!k || pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) void submit(next);
  };

  const close = () => {
    setPin('');
    setError(null);
    onDone(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={t.title}>🔐 보호자 확인</Text>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="닫기">
              <Ionicons name="close" size={28} color={colors.inkSoft} />
            </Pressable>
          </View>
          <Text style={[t.body, { color: colors.inkSoft }]}>{reason || '보호자 PIN 4자리를 눌러 주세요.'}</Text>
          <View style={styles.dots} accessibilityLabel={`${pin.length}자리 입력됨`}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
            ))}
          </View>
          <Text style={[t.caption, { textAlign: 'center', color: error ? colors.danger : colors.inkSoft, minHeight: 20 }]} accessibilityLiveRegion="polite">
            {busy ? '확인하는 중…' : error ?? '가입할 때 정한 숫자 4자리예요'}
          </Text>
          <View style={styles.pad}>
            {KEYS.map((k, i) => (
              <Pressable
                key={i}
                onPress={() => press(k)}
                disabled={!k}
                style={({ pressed }) => [styles.key, !k && { opacity: 0 }, pressed && { backgroundColor: colors.surfaceWarm }]}
                accessibilityRole="button"
                accessibilityLabel={k === 'del' ? '지우기' : k}
              >
                {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={colors.ink} /> : <Text style={styles.keyText}>{k}</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 480, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xxl, gap: space.md, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.lg, marginTop: space.md },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary },
  dotOn: { backgroundColor: colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  key: { width: '31%', height: 60, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  keyText: { fontFamily: fonts.title, fontSize: 26, color: colors.ink },
});
