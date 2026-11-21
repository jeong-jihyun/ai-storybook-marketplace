import Ionicons from '@expo/vector-icons/Ionicons';
import type { BookPage, MotionSettings } from '@storybook/shared-types';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigation } from 'expo-router';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { resolveAsset } from '../services/api';
import { narrationFor, useNarrationManifest } from '../motion/narration';
import { useReaderPrefs } from '../motion/prefs';
import { useStoryPlayer } from '../motion/useStoryPlayer';
import { colors, fonts, MIN_TOUCH, radius, space, type as t } from '../theme';
import { Button } from './Button';
import { NarratedText } from './NarratedText';
import { nextSpeed, PlayerBar } from './PlayerBar';
import { PageStage } from './PageStage';
import { StoryArt } from './StoryArt';

type Item = { kind: 'page'; page: BookPage } | { kind: 'end' };

/**
 * 그림책 넘겨 보기 (미리보기·구매한 책 공통).
 * 손가락으로 옆으로 넘기거나 아래 화살표로 넘긴다. 마지막 장 뒤에 endCard 를 보여 준다.
 * 읽어주기: 낭독 음성 + 그림 전체 움직임 + 읽는 문장 따라가는 자막 (재생 위치가 기준 시계).
 */
export function PageReader({ pages, totalPages, caption, endLabel, endCard, motion }: { pages: BookPage[]; totalPages: number; caption: (page: number) => string; endLabel: string; endCard: ReactNode; motion?: MotionSettings }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const width = size.width;
  // 가로(넓고 낮은 화면): 그림 왼쪽 · 글 오른쪽
  const side = size.width > size.height * 1.15 && size.width >= 560;
  const [index, setIndex] = useState(0);
  const kind = motion?.transition ?? 'slide';
  // 전체화면 (그림 가득 + 자막): 위·아래 메뉴를 숨기고, 화면을 누르면 조작 버튼이 나타난다
  const [full, setFull] = useState(false);
  const [ui, setUi] = useState(true);
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ headerShown: !full });
    return () => navigation.setOptions({ headerShown: true });
  }, [full, navigation]);
  const enterFull = () => {
    setFull(true);
    setUi(true);
    if (Platform.OS === 'web') (document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> }).requestFullscreen?.()?.catch(() => {});
  };
  const exitFull = () => {
    setFull(false);
    if (Platform.OS === 'web' && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const listRef = useRef<FlatList<Item>>(null);
  const items: Item[] = [...pages.map((page) => ({ kind: 'page' as const, page })), { kind: 'end' }];

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize({ width: Math.round(w), height: Math.round(h) });
  };
  // 화면을 돌리면 보던 쪽을 그대로 유지
  useEffect(() => {
    if (width) listRef.current?.scrollToOffset({ offset: index * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);
  const artW = side ? Math.min((size.height - space.xl * 2) * (4 / 3), width * 0.56) : width - space.xl * 2;
  const artH = (artW * 3) / 4;
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );
  const go = (i: number) => {
    const next = Math.max(0, Math.min(items.length - 1, i));
    if (kind === 'slide') listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    setIndex(next);
  };
  const atEnd = index >= items.length - 1;

  // ---- 읽어주기 (음성 + 움직임 + 자막) ----
  const prefs = useReaderPrefs();
  useEffect(() => void prefs.hydrate(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const manifest = useNarrationManifest();
  const bookId = pages[0]?.bookId ?? '';
  const cur = pages[index];
  const curNarration = narrationFor(manifest.data, bookId, cur?.pageNumber ?? -1, cur?.content);
  const voiceReady = !!manifest.data?.manifest.books[bookId];
  const playerPage = useMemo(
    () => (cur ? { pageNumber: cur.pageNumber, content: cur.content, audio: curNarration ? { url: curNarration.url, duration: curNarration.duration, cues: curNarration.cues } : null } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cur?.pageNumber, cur?.content, curNarration?.url],
  );
  const player = useStoryPlayer({
    page: playerPage,
    hasNext: index < pages.length - 1,
    speed: prefs.speed,
    narration: prefs.narration,
    onNext: () => go(index + 1),
  });

  const renderArt = (page: BookPage, w: number, h: number) => (
    <StoryArt
      uri={resolveAsset(page.imageUrl)}
      bookId={page.bookId}
      pageNumber={page.pageNumber}
      width={w}
      height={h}
      active={page.pageNumber === cur?.pageNumber}
      duration={player.duration}
      reduced={prefs.reduceMotion}
      subscribe={player.subscribe}
      getTime={player.getTime}
      label={`${page.pageNumber}쪽 그림`}
      motion={motion}
      layers={page.scene?.layers.map((l) => ({ id: l.id, uri: resolveAsset(l.url), px: l.px, py: l.py, motion: l.motion }))}
    />
  );
  const renderText = (page: BookPage, style: React.ComponentProps<typeof NarratedText>['style']) => {
    const active = page.pageNumber === cur?.pageNumber;
    return <NarratedText text={page.content} cues={active ? player.cues : []} on={prefs.captions && active && !full} subscribe={active ? player.subscribe : null} style={style} />;
  };

  const renderBody = (item: Item) => {
    if (item.kind === 'end') return <View style={[styles.end, full && { backgroundColor: colors.bg }]}>{endCard}</View>;
    if (full) {
      const fw = Math.min(width, size.height * (4 / 3));
      const fh = (fw * 3) / 4;
      return (
        <Pressable style={styles.fullPage} onPress={() => setUi((u) => !u)} accessibilityLabel="화면을 누르면 조작 버튼이 나타나요">
          {renderArt(item.page, fw, fh)}
        </Pressable>
      );
    }
    return side ? (
      <View style={styles.sideRow}>
        {renderArt(item.page, artW, artH)}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sideText}>
          {renderText(item.page, t.story)}
        </ScrollView>
      </View>
    ) : (
      <ScrollView contentContainerStyle={styles.page}>
        {renderArt(item.page, artW, artH)}
        {renderText(item.page, [t.story, { marginTop: space.xl }])}
      </ScrollView>
    );
  };

  // 전체화면에서 재생 중이면 조작 버튼을 잠시 뒤 숨김
  useEffect(() => {
    if (!full) return;
    if (!player.playing) {
      setUi(true);
      return;
    }
    if (!ui) return;
    const h = setTimeout(() => setUi(false), 3500);
    return () => clearTimeout(h);
  }, [full, ui, player.playing]);

  return (
    <>
      <View style={[{ flex: 1 }, full && { backgroundColor: '#0b0e22' }]} onLayout={onLayout}>
        {width > 0 && kind !== 'slide' ? (
          <PageStage index={index} width={size.width} height={size.height} kind={kind} instant={prefs.reduceMotion} bg={full ? '#0b0e22' : colors.bg} render={(i) => renderBody(items[i])} onSwipe={(d) => go(index + d)} />
        ) : null}
        {width > 0 && kind === 'slide' ? (
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            key={`${side ? 'side' : 'stack'}|${full}`}
            initialScrollIndex={index}
            keyExtractor={(it) => (it.kind === 'page' ? `p${it.page.pageNumber}` : 'end')}
            onScroll={onScroll}
            extraData={`${index}|${prefs.captions}|${prefs.reduceMotion}|${player.duration}|${player.cues.length}`}
            scrollEventThrottle={32}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => <View style={{ width, flex: 1 }}>{renderBody(item)}</View>}
          />
        ) : null}
        {full && (ui || atEnd) ? (
          <View style={styles.fullUi} pointerEvents="box-none">
            <View style={styles.fullTop} pointerEvents="box-none">
              <FullBtn icon="contract" label="전체화면 끝내기" onPress={exitFull} />
            </View>
            {!atEnd ? (
              <View style={styles.fullBottom} pointerEvents="box-none">
                <FullBtn icon="chevron-back" label="이전 쪽" onPress={() => go(index - 1)} disabled={index === 0} />
                <FullBtn icon={player.playing ? 'pause' : player.finished ? 'refresh' : 'play'} label={player.playing ? '일시정지' : '읽어주기 시작'} big onPress={player.playing ? player.pause : player.play} />
                <FullBtn icon="chevron-forward" label="다음 쪽" onPress={() => go(index + 1)} />
              </View>
            ) : null}
          </View>
        ) : null}
        {player.finished && index === pages.length - 1 ? (
          <View style={styles.doneWrap} pointerEvents="box-none">
            <View style={styles.doneCard} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={t.title}>이야기가 끝났어요 🌙</Text>
              <Text style={[t.body, { textAlign: 'center' }]}>마지막 쪽까지 다 읽었어요.{'\n'}그림이 멈춘 건 이야기가 끝나서예요.</Text>
              <View style={styles.doneBtns}>
                <Button
                  label="처음부터 다시"
                  variant="secondary"
                  onPress={() => {
                    go(0);
                    setTimeout(() => player.play(), 700);
                  }}
                />
                <Button label="마치기" onPress={() => go(items.length - 1)} />
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {full ? null : (
      <>
      <View style={side ? styles.bottomRow : undefined}>
      {!atEnd ? (
        <PlayerBar
          compact={side}
          playing={player.playing}
          finished={player.finished}
          voiceReady={voiceReady}
          narration={prefs.narration}
          captions={prefs.captions}
          speed={prefs.speed}
          reduceMotion={prefs.reduceMotion}
          onToggle={player.playing ? player.pause : player.play}
          onNarration={() => prefs.set({ narration: !prefs.narration })}
          onCaptions={() => prefs.set({ captions: !prefs.captions })}
          onSpeed={() => prefs.set({ speed: nextSpeed(prefs.speed) })}
          onReduce={() => prefs.set({ reduceMotion: !prefs.reduceMotion })}
          onFull={enterFull}
        />
      ) : null}

      <View style={[styles.nav, side && styles.navSide]}>
        <Pressable onPress={() => go(index - 1)} disabled={index === 0} style={[styles.navBtn, index === 0 && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="이전 쪽">
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.dots}>
            {items.map((it, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn, it.kind === 'end' && styles.dotEnd]} />
            ))}
          </View>
          <Text style={t.caption} accessibilityLiveRegion="polite">
            {atEnd ? endLabel : `${index + 1} / ${totalPages}쪽${caption(index + 1)}`}
          </Text>
        </View>
        <Pressable onPress={() => go(index + 1)} disabled={atEnd} style={[styles.navBtn, atEnd && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="다음 쪽">
          <Ionicons name="chevron-forward" size={26} color={colors.ink} />
        </Pressable>
      </View>
      </View>
      </>
      )}
    </>
  );
}

function FullBtn({ icon, label, onPress, big, on, disabled }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; big?: boolean; on?: boolean; disabled?: boolean }) {
  const size = big ? MIN_TOUCH + 16 : MIN_TOUCH;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.fullBtn, { width: size, height: size }, on === false && { opacity: 0.6 }, disabled && { opacity: 0.3 }, big && { backgroundColor: colors.primary }]}>
      <Ionicons name={icon} size={big ? 30 : 24} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, paddingBottom: space.xxxl },
  sideRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xl, paddingHorizontal: space.xl, paddingVertical: space.lg },
  sideText: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.md },
  art: { width: '100%', borderRadius: radius.lg, backgroundColor: colors.surfaceWarm },
  bottomRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  navSide: { borderTopWidth: 0, paddingVertical: 4, gap: space.md },
  doneWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(20,24,50,0.45)' },
  doneCard: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md, alignItems: 'center' },
  doneBtns: { alignSelf: 'stretch', gap: space.sm },
  fullPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0e22' },
  fullUi: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'space-between', padding: space.md },
  fullTop: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  fullBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg, marginBottom: 110 },
  fullBtn: { borderRadius: 999, backgroundColor: 'rgba(8,10,28,0.65)', alignItems: 'center', justifyContent: 'center' },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  navBtn: { width: MIN_TOUCH + 4, height: MIN_TOUCH + 4, borderRadius: radius.pill, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 220 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.primary, width: 20 },
  dotEnd: { backgroundColor: colors.sun },
});
