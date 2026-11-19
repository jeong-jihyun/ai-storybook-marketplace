/** 2026-12-20T… → 12월 20일 */
export const monthDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
