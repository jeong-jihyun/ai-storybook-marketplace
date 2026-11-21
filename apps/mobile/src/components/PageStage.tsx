import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import type { MotionTransition } from '@storybook/shared-types';

/**
 * 쪽 넘김 효과 무대 (옆으로 밀기 말고 페이드·책장·줌·위로·커튼).
 * 현재 쪽과 직전 쪽을 겹쳐 놓고, 진행도 p(0→1) 하나로 두 쪽의 모양을 계산한다.
 * 모션 줄이기가 켜져 있으면 효과 없이 바로 바뀐다.
 */
export const TRANSITION_MS = 520;

export function PageStage({
  index,
  width,
  height,
  kind,
  instant,
  bg,
  render,
  onSwipe,
}: {
  index: number;
  width: number;
  height: number;
  kind: Exclude<MotionTransition, 'slide'>;
  instant: boolean;
  /** 쪽 배경색 (겹친 쪽이 비쳐 보이지 않게) */
  bg: string;
  render: (i: number) => ReactNode;
  /** 손가락으로 밀었을 때 (+1 다음, -1 이전) */
  onSwipe: (dir: 1 | -1) => void;
}) {
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const last = useRef(index);
  const p = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (index === last.current) return;
    const d: 1 | -1 = index > last.current ? 1 : -1;
    const from = last.current;
    last.current = index;
    if (instant) {
      p.setValue(1);
      setPrev(null);
      return;
    }
    setDir(d);
    setPrev(from);
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: TRANSITION_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPrev(null);
    });
  }, [index, instant, p]);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) onSwipe(1);
          else if (g.dx > 50) onSwipe(-1);
        },
      }),
    [onSwipe],
  );

  const W = width;
  const H = height;
  const lerpTo = (a: number, b: number) => p.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const fill = { width: W, height: H, backgroundColor: bg };

  let layers: ReactNode;
  if (prev === null) {
    layers = <View style={[styles.abs, fill]}>{render(index)}</View>;
  } else if (kind === 'fade') {
    layers = (
      <>
        <View style={[styles.abs, fill]}>{render(prev)}</View>
        <Animated.View style={[styles.abs, fill, { opacity: p }]}>{render(index)}</Animated.View>
      </>
    );
  } else if (kind === 'zoom') {
    // 앞 쪽은 커지며 사라지고, 다음 쪽은 작았다가 제 크기로 (뒤로 갈 땐 반대)
    layers = (
      <>
        <Animated.View style={[styles.abs, fill, { opacity: lerpTo(1, 0), transform: [{ scale: lerpTo(1, dir === 1 ? 1.4 : 0.7) }] }]}>{render(prev)}</Animated.View>
        <Animated.View style={[styles.abs, fill, { opacity: p, transform: [{ scale: lerpTo(dir === 1 ? 0.7 : 1.4, 1) }] }]}>{render(index)}</Animated.View>
      </>
    );
  } else if (kind === 'up') {
    // 다음 쪽이 아래에서 밀려 올라오고, 앞 쪽은 살짝 위로 물러난다 (뒤로 갈 땐 위에서 내려옴)
    layers = (
      <>
        <Animated.View style={[styles.abs, fill, { opacity: lerpTo(1, 0.4), transform: [{ translateY: lerpTo(0, dir === 1 ? -H * 0.25 : H * 0.25) }] }]}>{render(prev)}</Animated.View>
        <Animated.View style={[styles.abs, fill, { transform: [{ translateY: lerpTo(dir === 1 ? H : -H, 0) }] }]}>{render(index)}</Animated.View>
      </>
    );
  } else if (kind === 'curtain') {
    // 앞 쪽이 가운데서 양쪽으로 갈라져 열리며 다음 쪽이 드러난다 (뒤로 갈 땐 닫힘)
    const open = dir === 1;
    const showTop = open ? prev : index;
    const under = open ? index : prev;
    const left = (
      <Animated.View style={[styles.abs, { width: W / 2, height: H, overflow: 'hidden', backgroundColor: bg, transform: [{ translateX: open ? lerpTo(0, -W / 2) : lerpTo(-W / 2, 0) }] }]}>
        <View style={{ width: W, height: H }}>{render(showTop)}</View>
      </Animated.View>
    );
    const right = (
      <Animated.View style={[styles.abs, { left: W / 2, width: W / 2, height: H, overflow: 'hidden', backgroundColor: bg, transform: [{ translateX: open ? lerpTo(0, W / 2) : lerpTo(W / 2, 0) }] }]}>
        <View style={{ width: W, height: H, marginLeft: -W / 2 }}>{render(showTop)}</View>
      </Animated.View>
    );
    layers = (
      <>
        <View style={[styles.abs, fill]}>{render(under)}</View>
        {left}
        {right}
      </>
    );
  } else {
    // flip: 책장이 왼쪽 가장자리를 축으로 넘어간다. 앞으로: 앞 쪽이 넘어감 / 뒤로: 이전 쪽이 도로 덮임
    const turning = dir === 1 ? prev : index;
    const under = dir === 1 ? index : prev;
    const rot = dir === 1 ? lerpTo(0, -100) : lerpTo(-100, 0);
    const shade = dir === 1 ? lerpTo(0, 0.5) : lerpTo(0.5, 0);
    layers = (
      <>
        <View style={[styles.abs, fill]}>{render(under)}</View>
        <Animated.View style={[styles.abs, fill, { backgroundColor: '#000', opacity: shade }]} pointerEvents="none" />
        <Animated.View
          style={[
            styles.abs,
            fill,
            {
              transformOrigin: 'left center',
              transform: [{ perspective: 1200 }, { rotateY: rot.interpolate({ inputRange: [-100, 0], outputRange: ['-100deg', '0deg'] }) }],
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
          ]}
        >
          {render(turning)}
        </Animated.View>
      </>
    );
  }

  return (
    <View style={[styles.root, fill]} {...swipe.panHandlers}>
      {layers}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  abs: { position: 'absolute', left: 0, top: 0 },
});
