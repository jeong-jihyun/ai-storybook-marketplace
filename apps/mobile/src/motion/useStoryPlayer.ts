import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { estimateCues, type Cue } from './captions';
import { estimateDuration } from './engine';

export interface PlayerPage {
  pageNumber: number;
  content: string;
  /** 낭독 음성(없으면 소리 없이 시간만 흐른다) */
  audio: { url: string; duration: number; cues: Cue[] } | null;
}

type Listener = (t: number) => void;

/**
 * 읽기 플레이어: 재생 위치(t)가 그림 움직임과 자막의 '기준 시계'다.
 * - 음성이 있으면 음성의 현재 위치를, 없으면 속도에 맞춰 흐르는 가상 시계를 쓴다.
 * - 시계가 바뀔 때마다 화면 전체를 다시 그리지 않도록, 구독 방식(subscribe)으로 필요한 곳만 갱신한다.
 */
export function useStoryPlayer(opts: { page: PlayerPage | null; hasNext: boolean; speed: number; narration: boolean; onNext: () => void }) {
  const { page, hasNext, speed, narration } = opts;
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  const audio = narration ? page?.audio ?? null : null;
  const duration = audio?.duration ?? (page ? estimateDuration(page.content) : 0);
  const cues = useMemo(() => (audio ? audio.cues : page ? estimateCues(page.content, duration) : []), [audio, page, duration]);

  // 최신 값을 루프/이벤트 안에서 쓰기 위한 보관함
  const live = useRef({ playing, audio, duration, speed, hasNext, onNext: opts.onNext, pageNumber: page?.pageNumber ?? -1 });
  live.current = { playing, audio, duration, speed, hasNext, onNext: opts.onNext, pageNumber: page?.pageNumber ?? -1 };

  const vt = useRef(0); // 가상 시계(초)
  const t = useRef(0);
  const listeners = useRef(new Set<Listener>());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedUrl = useRef<string | null>(null);

  const emit = useCallback((v: number) => {
    t.current = v;
    listeners.current.forEach((l) => l(v));
  }, []);
  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l);
    return () => void listeners.current.delete(l);
  }, []);
  const getTime = useCallback(() => t.current, []);

  const clearAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  // 한 쪽을 다 읽었을 때: 다음 쪽이 있으면 잠깐 쉬고 넘어가 계속, 없으면 멈춤
  const onPageDone = useCallback(() => {
    const L = live.current;
    if (!L.playing || advanceTimer.current) return;
    if (L.hasNext) {
      const pn = L.pageNumber;
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        if (live.current.pageNumber === pn && live.current.playing) live.current.onNext();
      }, 700);
    } else {
      setPlaying(false);
      setFinished(true);
    }
  }, []);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // 쪽이 바뀌거나 음성 주소가 바뀌면: 시계를 처음으로, 음성 교체
  const url = audio?.url ?? null;
  useEffect(() => {
    clearAdvance();
    vt.current = 0;
    setFinished(false);
    emit(0);
    if (url) {
      if (loadedUrl.current !== url) {
        player.replace(url);
        loadedUrl.current = url;
      } else {
        void player.seekTo(0);
      }
      player.setPlaybackRate(live.current.speed);
      if (live.current.playing) player.play();
    } else {
      loadedUrl.current = null;
      player.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.pageNumber, url]);

  useEffect(() => {
    if (url) player.setPlaybackRate(speed);
  }, [speed, url, player]);

  // 음성이 끝났다는 알림
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish && live.current.audio) onPageDone();
    });
    return () => sub.remove();
  }, [player, onPageDone]);

  // 재생 중 시계 돌리기
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = Date.now();
    let lastEmit = 0;
    const loop = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      const L = live.current;
      let cur: number;
      if (L.audio) {
        cur = player.currentTime;
        // 끝났다는 알림이 안 와도(기기에 따라) 음성 길이를 지나면 한 쪽이 끝난 것으로 본다
        if (cur >= L.duration + 1.2) onPageDone();
      } else {
        vt.current += dt * L.speed;
        cur = vt.current;
        if (cur >= L.duration + 0.6) onPageDone();
      }
      if (now - lastEmit >= 33) {
        lastEmit = now;
        emit(cur);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, player, emit, onPageDone]);

  const play = useCallback(() => {
    const L = live.current;
    setFinished(false);
    if (t.current >= L.duration - 0.05 || finished) {
      vt.current = 0;
      emit(0);
      if (L.audio) void player.seekTo(0);
    }
    setPlaying(true);
    if (L.audio) player.play();
  }, [emit, finished, player]);

  const pause = useCallback(() => {
    clearAdvance();
    setPlaying(false);
    player.pause();
  }, [player]);

  // 앱이 뒤로 가면 멈춤 (백그라운드에서 소리·움직임이 계속되지 않게)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  // 화면을 떠나면 정리
  useEffect(
    () => () => {
      clearAdvance();
      try {
        player.pause();
      } catch {
        // 이미 해제됨
      }
    },
    [player],
  );

  return { playing, finished, duration, cues, hasAudio: !!audio, play, pause, subscribe, getTime };
}
