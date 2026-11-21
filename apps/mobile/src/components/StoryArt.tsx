import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { cameraAt, motionFor, particlesAt, type MotionOverride } from '../motion/engine';
import { colors, radius } from '../theme';

type Subscribe = (l: (t: number) => void) => () => void;

/** 재생 위치 t(초)를 구독한다. 켜져 있지 않으면 0(움직이기 전 모습) */
export function useClock(subscribe: Subscribe, getTime: () => number, enabled: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setT(0);
      return;
    }
    setT(getTime());
    return subscribe(setT);
  }, [enabled, subscribe, getTime]);
  return t;
}

/**
 * 그림 한 장 전체를 움직인다 (확대·이동·둥실·살랑 + 반짝이/눈송이).
 * 움직임은 모두 재생 위치 t 로 계산 → 멈추면 멈추고, 되감으면 같은 모습.
 */
export function StoryArt({
  uri,
  bookId,
  pageNumber,
  width,
  height,
  active,
  duration,
  reduced,
  subscribe,
  getTime,
  label,
  motion,
}: {
  uri: string;
  bookId: string;
  pageNumber: number;
  width: number;
  height: number;
  active: boolean;
  duration: number;
  reduced: boolean;
  subscribe: Subscribe;
  getTime: () => number;
  label: string;
  /** 관리자가 정한 이 책의 움직임 설정 (없으면 자동) */
  motion?: MotionOverride;
}) {
  const t = useClock(subscribe, getTime, active);
  const cfg = useMemo(() => motionFor(bookId, pageNumber, motion), [bookId, pageNumber, motion?.enabled, motion?.camera, motion?.particles]); // eslint-disable-line react-hooks/exhaustive-deps
  const cam = cameraAt(cfg, t, duration, reduced);
  const ps = active ? particlesAt(cfg, t, reduced) : [];

  // 쪽이 나타날 때 살짝 부드럽게 (모션 줄이기에서도 똑같이)
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return;
    fade.setValue(0.5);
    Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [active, fade]);

  return (
    <Animated.View style={[styles.frame, { width, height, opacity: fade }]}>
      <Image
        source={{ uri }}
        style={{
          width,
          height,
          transform: [{ translateX: cam.tx * width }, { translateY: cam.ty * height }, { rotate: `${cam.rotateDeg}deg` }, { scale: cam.scale }],
        }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={label}
      />
      {ps.length > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {ps.map((p, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: p.x * width - p.size / 2,
                top: p.y * height - p.size / 2,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: colors.white,
                opacity: p.opacity,
              }}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceWarm },
});
