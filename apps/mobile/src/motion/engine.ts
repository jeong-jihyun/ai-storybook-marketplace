// 그림 전체 모션 엔진 (순수 계산, 화면 코드와 분리해 시험할 수 있게 함)
// 원칙: 모션은 '누적된 프레임 시간'이 아니라 '지금 재생 위치 t(초)'만으로 계산한다.
//       그래서 일시정지하면 멈추고, 되감기/건너뛰기해도 항상 같은 장면이 나온다.

export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounceOut';

export const easings: Record<Easing, (x: number) => number> = {
  linear: (x) => x,
  easeIn: (x) => x * x,
  easeOut: (x) => 1 - (1 - x) * (1 - x),
  easeInOut: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  bounceOut: (x) => {
    const n = 7.5625;
    const d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** 같은 글자 → 같은 숫자. 책/쪽마다 '다른데 항상 같은' 모션을 고르는 데 쓴다. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 음성이 지금 화면의 글과 맞는가. 음성을 만들 때 적어 둔 textHash 와 글의 해시를 비교한다.
 * textHash 가 없는(옛 매니페스트) 음성은 확인할 수 없으니 그대로 쓴다.
 */
export function narrationMatchesText(textHash: number | undefined, text: string | undefined): boolean {
  return text === undefined || textHash === undefined || textHash === hashSeed(text);
}

/** 씨앗이 같으면 항상 같은 수열을 주는 난수 (mulberry32) */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CameraKind = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight' | 'still';
export type ParticleKind = 'sparkle' | 'snow' | 'none';

export interface MotionConfig {
  camera: CameraKind;
  /** 둥실(위아래) 크기: 그림 높이 대비 비율 */
  floatAmp: number;
  /** 둥실 한 번 도는 시간(초) */
  floatPeriod: number;
  /** 살랑(기울기) 각도(도) */
  swayDeg: number;
  swayPeriod: number;
  particles: ParticleKind;
  particleCount: number;
  seed: number;
}

export const MAX_PARTICLES = 30;
const CAMERAS: CameraKind[] = ['zoomIn', 'panLeft', 'zoomOut', 'panRight'];

/** 관리자가 책마다 정하는 움직임 설정 (packages/shared-types MotionSettings 와 같은 모양) */
export interface MotionOverride {
  enabled: boolean;
  camera: 'auto' | CameraKind;
  particles: 'auto' | ParticleKind;
}

/**
 * 책 id + 쪽 번호로 그 쪽의 모션을 정한다 (항상 같은 결과).
 * override: 관리자 설정. enabled=false 면 그림을 움직이지 않고, 'auto' 가 아닌 값은 그 값으로 고정한다.
 */
export function motionFor(bookId: string, pageNumber: number, override?: MotionOverride): MotionConfig {
  const base = baseMotion(bookId, pageNumber);
  if (!override) return base;
  if (!override.enabled) return { ...base, camera: 'still', floatAmp: 0, swayDeg: 0, particles: 'none', particleCount: 0 };
  return {
    ...base,
    camera: override.camera === 'auto' ? base.camera : override.camera,
    particles: override.particles === 'auto' ? base.particles : override.particles,
  };
}

function baseMotion(bookId: string, pageNumber: number): MotionConfig {
  const seed = hashSeed(`${bookId}:${pageNumber}`);
  const rnd = seeded(seed);
  // 쪽을 넘길 때마다 카메라가 번갈아 달라지게 (같은 책 안에서 연속 두 쪽이 같은 움직임이 되지 않게)
  const camera = CAMERAS[(pageNumber + (hashSeed(bookId) % 4)) % 4];
  return {
    camera,
    floatAmp: 0.006 + rnd() * 0.006,
    floatPeriod: 5 + rnd() * 3,
    swayDeg: 0.35 + rnd() * 0.35,
    swayPeriod: 6 + rnd() * 3,
    particles: pageNumber % 3 === 0 ? 'snow' : 'sparkle',
    particleCount: 14 + Math.floor(rnd() * 8),
    seed,
  };
}

export interface Transform {
  scale: number;
  /** 그림 너비 대비 비율 */
  tx: number;
  /** 그림 높이 대비 비율 */
  ty: number;
  rotateDeg: number;
}

const TAU = Math.PI * 2;

/**
 * 재생 위치 t(초), 이 쪽의 길이 dur(초)로 그림의 카메라 변환을 계산한다.
 * reduced=true(모션 줄이기)면 확대·이동·기울기 없이 제자리에 둔다.
 * (쪽이 바뀔 때 부드럽게 나타나는 효과는 화면 쪽에서 모든 모드에 똑같이 준다.)
 */
export function cameraAt(cfg: MotionConfig, t: number, dur: number, reduced = false): Transform {
  if (reduced) return { scale: 1, tx: 0, ty: 0, rotateDeg: 0 };
  const p = easings.easeInOut(clamp01(dur > 0 ? t / dur : 0));
  let scale = 1.0;
  let tx = 0;
  switch (cfg.camera) {
    case 'zoomIn':
      scale = lerp(1.0, 1.09, p);
      break;
    case 'zoomOut':
      scale = lerp(1.09, 1.0, p);
      break;
    case 'panLeft':
      scale = 1.08;
      tx = lerp(0.025, -0.025, p);
      break;
    case 'panRight':
      scale = 1.08;
      tx = lerp(-0.025, 0.025, p);
      break;
  }
  // 둥실·살랑은 '위치 t'의 사인파 → 되감아도 같은 모습
  const ty = Math.sin((t / cfg.floatPeriod) * TAU) * cfg.floatAmp;
  const rotateDeg = Math.sin((t / cfg.swayPeriod) * TAU + 1.3) * cfg.swayDeg;
  return { scale, tx, ty, rotateDeg };
}

export interface Particle {
  /** 0~1 (그림 안 위치 비율) */
  x: number;
  y: number;
  size: number;
  opacity: number;
}

/**
 * t초 시점의 반짝이/눈송이 위치. 개수는 MAX_PARTICLES를 넘지 않는다.
 * reduced=true면 빈 목록.
 */
export function particlesAt(cfg: MotionConfig, t: number, reduced = false): Particle[] {
  if (reduced || cfg.particles === 'none') return [];
  const n = Math.min(MAX_PARTICLES, Math.max(0, cfg.particleCount));
  const rnd = seeded(cfg.seed ^ 0x9e3779b9);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = rnd();
    const y0 = rnd();
    const size = 2 + rnd() * 3;
    const phase = rnd();
    const speed = 0.4 + rnd() * 0.6;
    if (cfg.particles === 'sparkle') {
      // 제자리에서 깜빡깜빡
      const tw = 0.5 + 0.5 * Math.sin((t * speed * 1.6 + phase) * TAU);
      out.push({ x: x0, y: y0, size: size * (0.7 + 0.5 * tw), opacity: 0.15 + 0.75 * tw * tw });
    } else {
      // 위에서 아래로 천천히 내리는 눈송이(아래로 나가면 위에서 다시)
      const fall = (y0 + t * 0.035 * speed + phase) % 1;
      const sway = Math.sin((t * 0.35 * speed + phase) * TAU) * 0.015;
      const edge = Math.min(fall, 1 - fall) * 8;
      out.push({ x: x0 + sway, y: fall, size, opacity: Math.min(0.85, 0.3 + 0.5 * clamp01(edge)) });
    }
  }
  return out;
}

/** 말하는 속도에 맞춰 목소리 없이 읽을 때의 쪽 길이 추정(초) */
export function estimateDuration(text: string): number {
  const chars = text.replace(/\s/g, '').length;
  return Math.max(6, Math.min(40, chars * 0.17));
}

// ───── 층 장면: 층 하나의 변환을 (t, 쪽 길이 D) 로 계산 ─────

export type LayerMotionKind = 'drift' | 'slide' | 'bob' | 'sway' | 'breathe' | 'blink' | 'twinkle' | 'rise' | 'spin' | 'ramp';
export interface LayerMotionSpec {
  kind: LayerMotionKind;
  amp?: number;
  period?: number;
  phase?: number;
  dx?: number;
  dy?: number;
  from?: [number, number];
  to?: [number, number];
  start?: number;
  end?: number;
  dur?: number;
  opFrom?: number;
  opTo?: number;
}
export interface LayerState {
  /** 그림 너비 대비 */
  tx: number;
  /** 그림 높이 대비 */
  ty: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
}

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const frac = (x: number) => x - Math.floor(x);

/**
 * 층 하나의 모양을 계산한다. 여러 움직임은 겹쳐서(이동·각도는 더하고, 크기·투명도는 곱해서) 적용.
 * t: 재생 위치(초), D: 이 쪽의 길이(초). reduced(모션 줄이기)면 가만히 두고 blink·rise 층은 숨긴다.
 */
export function layerState(motions: LayerMotionSpec[], t: number, D: number, reduced = false): LayerState {
  const st: LayerState = { tx: 0, ty: 0, rotateDeg: 0, scale: 1, opacity: 1 };
  const dur = Math.max(1, D);
  const prog = clamp01(t / dur);
  for (const m of motions) {
    const period = Math.max(0.2, m.period ?? 6);
    const phase = m.phase ?? 0;
    const amp = m.amp ?? 0;
    switch (m.kind) {
      case 'blink':
        if (reduced) st.opacity *= 0;
        else st.opacity *= frac(t / period + phase) * period < (m.dur ?? 0.16) ? 1 : 0;
        break;
      case 'rise': {
        if (reduced) {
          st.opacity *= 0;
          break;
        }
        const u = frac(t / period + phase);
        st.ty += -amp * u;
        st.opacity *= Math.sin(Math.PI * u);
        break;
      }
      case 'ramp': {
        const a = m.start ?? 0;
        const b = Math.max(a + 0.001, m.end ?? 1);
        const p = reduced ? 0 : clamp01((prog - a) / (b - a));
        st.opacity *= lerp(m.opFrom ?? 0, m.opTo ?? 1, p);
        break;
      }
      case 'slide': {
        if (reduced) break;
        const a = m.start ?? 0;
        const b = Math.max(a + 0.001, m.end ?? 1);
        const p = easeInOut(clamp01((prog - a) / (b - a)));
        const f = m.from ?? [0, 0];
        const to = m.to ?? [0, 0];
        st.tx += lerp(f[0], to[0], p);
        st.ty += lerp(f[1], to[1], p);
        break;
      }
      case 'drift':
        if (!reduced) {
          st.tx += (m.dx ?? 0) * prog;
          st.ty += (m.dy ?? 0) * prog;
        }
        break;
      case 'bob':
        if (!reduced) st.ty += Math.sin((t / period + phase) * TAU) * amp;
        break;
      case 'sway':
        if (!reduced) st.rotateDeg += Math.sin((t / period + phase) * TAU) * amp;
        break;
      case 'breathe':
        if (!reduced) st.scale *= 1 + Math.sin((t / period + phase) * TAU) * amp;
        break;
      case 'twinkle':
        if (!reduced) st.opacity *= 1 - amp * (0.5 + 0.5 * Math.sin((t / period + phase) * TAU));
        break;
      case 'spin': {
        // end 가 있으면 그 시점(쪽 길이 비율)까지만 돌고 멈춘다 (기차가 서면 바퀴도 멈춤)
        const te = m.end !== undefined ? Math.min(t, m.end * dur) : t;
        if (!reduced) st.rotateDeg += ((te / period + phase) * 360) % 360;
        break;
      }
    }
  }
  return st;
}
