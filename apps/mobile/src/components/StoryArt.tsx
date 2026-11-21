import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { cameraAt, layerState, motionFor, particlesAt, type MotionOverride } from '../motion/engine';
import type { LayerMotion } from '@storybook/shared-types';
import { colors, radius } from '../theme';

/** 층 장면의 한 층 (uri 는 이미 앱이 내려받을 수 있는 주소) */
export interface ArtLayer {
  id: string;
  uri: string;
  px?: number;
  py?: number;
  motion: LayerMotion[];
}

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
  layers,
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
  /** 층으로 나뉜 장면 (있으면 통그림 대신 층마다 따로 움직인다) */
  layers?: ArtLayer[];
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
      {layers && layers.length > 0 ? (
        <View
          style={{
            width,
            height,
            transform: [{ translateX: cam.tx * width }, { translateY: cam.ty * height }, { rotate: `${cam.rotateDeg}deg` }, { scale: cam.scale }],
          }}
          accessibilityLabel={label}
        >
          {layers.map((l) => {
            const st = layerState(l.motion, t, duration, reduced);
            return (
              <Image
                key={l.id}
                source={{ uri: l.uri }}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width,
                  height,
                  opacity: st.opacity,
                  transformOrigin: `${(l.px ?? 0.5) * 100}% ${(l.py ?? 0.5) * 100}%`,
                  transform: [{ translateX: st.tx * width }, { translateY: st.ty * height }, { rotate: `${st.rotateDeg}deg` }, { scale: st.scale }],
                }}
                contentFit="fill"
                transition={0}
              />
            );
          })}
        </View>
      ) : (
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
      )}
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
