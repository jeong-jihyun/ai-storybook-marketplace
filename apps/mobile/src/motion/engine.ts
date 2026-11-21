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

export type CameraKind = 'zoomIn' | 'zoomOut' | 'panLeft' | 'panRight';
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

/** 책 id + 쪽 번호로 그 쪽의 모션을 정한다 (항상 같은 결과) */
export function motionFor(bookId: string, pageNumber: number): MotionConfig {
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
