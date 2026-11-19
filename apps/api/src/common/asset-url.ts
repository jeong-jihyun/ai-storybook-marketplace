/**
 * 저장소 키(storage key) → 앱이 내려받을 주소.
 * 1단계: API 서버가 storage 폴더를 /api/v1/assets 로 직접 제공한다.
 * 이후: S3 호환 Object Storage 의 짧은 만료시간 서명 URL 로 교체 (설계서 9장 파일 보안).
 * PUBLIC_BASE_URL 이 없으면 상대 경로를 돌려주고, 앱이 API 주소를 앞에 붙인다.
 */
export const ASSET_PREFIX = '/api/v1/assets';

export function assetUrl(key: string): string {
  if (!key) return '';
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${ASSET_PREFIX}/${key}`;
}
