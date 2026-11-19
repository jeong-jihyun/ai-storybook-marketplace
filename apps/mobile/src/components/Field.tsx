import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, MIN_TOUCH, radius, space, type as t } from '../theme';

/** 입력칸 (이름표 + 도움말/오류) — 모든 입력 화면 공통 */
export function Field({ label, error, hint, secure, ...rest }: TextInputProps & { label: string; error?: string | null; hint?: string; secure?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, !!error && { borderColor: colors.danger }]}>
        <TextInput
          {...rest}
          secureTextEntry={secure && !show}
          placeholderTextColor={colors.inkMute}
          style={styles.input}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secure ? (
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} accessibilityLabel={show ? '비밀번호 숨기기' : '비밀번호 보기'}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.inkMute} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[t.caption, { color: colors.danger }]}>{error}</Text> : hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

export function Check({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.check}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={26} color={checked ? colors.primary : colors.inkMute} />
      <View style={{ flex: 1 }}>
        <Text style={t.body}>{label}</Text>
        {sub ? <Text style={t.caption}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.title, fontSize: 15, color: colors.ink },
  box: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as object,
  check: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: MIN_TOUCH, paddingVertical: 4 },
});
