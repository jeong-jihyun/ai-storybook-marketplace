/** 로그인 뒤 돌아갈 곳: 앱 안 경로만 허용 (외부 주소로 튕기는 것 방지) */
export const safeNext = (next?: string) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

/** 같은 주문을 두 번 만들지 않기 위한 키 */
export const newIdempotencyKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
