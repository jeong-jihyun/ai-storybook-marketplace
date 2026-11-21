import type { MotionSettings } from '@storybook/shared-types';

// 주의: 서버(CommonJS 빌드)는 shared-types 의 '값'을 가져올 수 없어(타입 전용) 여기에 따로 둔다.
// shared-types 의 DEFAULT_MOTION·NARRATION_VOICES 와 같아야 하며, 시험(admin.e2e)이 같은지 확인한다.
export const DEFAULT_MOTION_SETTINGS: MotionSettings = { enabled: true, camera: 'auto', particles: 'auto' };
export const VOICE_IDS = ['narrator', 'uncle', 'friend'] as const;
export const MOTION_CAMERAS = ['auto', 'zoomIn', 'zoomOut', 'panLeft', 'panRight', 'still'] as const;
export const MOTION_PARTICLES = ['auto', 'sparkle', 'snow', 'none'] as const;

/** DB(JSONB)나 요청에서 온 값을 안전한 설정으로 정리 */
export function normalizeMotion(raw: unknown, base: MotionSettings = DEFAULT_MOTION_SETTINGS): MotionSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : base.enabled,
    camera: (MOTION_CAMERAS as readonly unknown[]).includes(r.camera) ? (r.camera as MotionSettings['camera']) : base.camera,
    particles: (MOTION_PARTICLES as readonly unknown[]).includes(r.particles) ? (r.particles as MotionSettings['particles']) : base.particles,
  };
}
