import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SPEEDS } from '../motion/prefs';
import { colors, fonts, MIN_TOUCH, radius, space } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Toggle({ icon, label, on, disabled, onPress, a11y }: { icon: IconName; label: string; on: boolean; disabled?: boolean; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !!disabled }}
      accessibilityLabel={a11y}
      style={[styles.tog, on && styles.togOn, disabled && { opacity: 0.4 }]}
    >
      <Ionicons name={icon} size={20} color={on ? colors.primaryText : colors.inkSoft} />
      <Text style={[styles.togLabel, on && { color: colors.primaryText }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 읽어주기 · 목소리 · 자막 · 속도 · 모션 줄이기 */
export function PlayerBar({
  compact,
  playing,
  finished,
  voiceReady,
  narration,
  captions,
  speed,
  reduceMotion,
  onToggle,
  onNarration,
  onCaptions,
  onSpeed,
  onReduce,
}: {
  compact?: boolean;
  playing: boolean;
  finished: boolean;
  voiceReady: boolean;
  narration: boolean;
  captions: boolean;
  speed: number;
  reduceMotion: boolean;
  onToggle: () => void;
  onNarration: () => void;
  onCaptions: () => void;
  onSpeed: () => void;
  onReduce: () => void;
}) {
  const useVoice = voiceReady && narration;
  const main = playing ? '멈춰요' : finished ? '다시 해요' : useVoice ? '읽어줘요' : '움직여요';
  return (
    <View style={[styles.bar, compact && { flex: 1, borderTopWidth: 0 }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? '일시정지' : useVoice ? '동화 읽어주기 시작' : '그림 움직이기 시작'}
        style={({ pressed }) => [styles.main, pressed && { backgroundColor: colors.primaryPressed }]}
      >
        <Ionicons name={playing ? 'pause' : finished ? 'refresh' : 'play'} size={22} color={colors.white} />
        <Text style={styles.mainLabel}>{main}</Text>
      </Pressable>
      <Toggle icon={voiceReady && narration ? 'volume-high' : 'volume-mute'} label={voiceReady ? '목소리' : '준비중'} on={voiceReady && narration} disabled={!voiceReady} onPress={onNarration} a11y={voiceReady ? (narration ? '목소리 끄기' : '목소리 켜기') : '목소리 준비 중'} />
      <Toggle icon="text" label="자막" on={captions} onPress={onCaptions} a11y={captions ? '자막 끄기' : '자막 켜기'} />
      <Pressable onPress={onSpeed} accessibilityRole="button" accessibilityLabel={`읽는 속도 ${speed}배, 누르면 바뀜`} style={styles.tog}>
        <Text style={styles.speed}>{speed}x</Text>
        <Text style={styles.togLabel}>속도</Text>
      </Pressable>
      <Toggle icon="color-wand" label="움직임" on={!reduceMotion} onPress={onReduce} a11y={reduceMotion ? '그림 움직임 켜기' : '그림 움직임 줄이기'} />
    </View>
  );
}

export const nextSpeed = (cur: number) => SPEEDS[(Math.max(0, SPEEDS.indexOf(cur as never)) + 1) % SPEEDS.length];

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  main: { flex: 2.2, minHeight: MIN_TOUCH, borderRadius: radius.pill, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  mainLabel: { fontFamily: fonts.title, fontSize: 16, color: colors.white },
  tog: { flex: 1, minHeight: MIN_TOUCH, borderRadius: radius.md, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center', gap: 1 },
  togOn: { backgroundColor: colors.sunSoft },
  togLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft },
  speed: { fontFamily: fonts.title, fontSize: 15, color: colors.primaryText },
});
