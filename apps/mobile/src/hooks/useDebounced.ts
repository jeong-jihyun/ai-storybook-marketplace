import { useEffect, useState } from 'react';

/** 입력이 멈추고 delay(ms) 뒤에 값을 바꾼다 — 글자마다 서버를 부르지 않기 위함 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
