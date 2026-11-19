// 지금 시각 (테스트에서 날짜를 앞당겨 구독 갱신·만료를 시험하기 위해 주입)
export interface Clock {
  now(): Date;
}
export const CLOCK = Symbol('CLOCK');
export const systemClock: Clock = { now: () => new Date() };
