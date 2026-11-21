// 자막 맞추기: 목소리 재생 위치(초) → 지금 읽고 있는 문장

export interface Cue {
  start: number;
  end: number;
  text: string;
}

/** 본문을 문장 단위로 나눈다 (마침표·물음표·느낌표 뒤, 따옴표 포함) */
export function splitSentences(text: string): string[] {
  const m = text.match(/[^.!?…]+(?:[.!?…]+["”’')]*)?\s*/g) ?? [];
  const out = m.map((s) => s.trim()).filter(Boolean);
  return out.length ? out : [text];
}

/** t초에 해당하는 cue 번호. 첫 문장 앞이면 0, 마지막 문장 뒤면 마지막. cue가 없으면 -1 */
export function activeCueIndex(cues: Cue[], t: number): number {
  if (!cues.length) return -1;
  for (let i = cues.length - 1; i >= 0; i--) {
    if (t >= cues[i].start) return i;
  }
  return 0;
}

/**
 * 화면에 보이는 문장 목록(sentences) 중 지금 읽는 문장 번호.
 * cue 개수와 문장 개수가 같으면 1:1, 다르면 글자 수 비율로 맞춘다.
 */
export function activeSentenceIndex(sentences: string[], cues: Cue[], t: number): number {
  if (!cues.length || !sentences.length) return -1;
  const ci = activeCueIndex(cues, t);
  if (cues.length === sentences.length) return ci;
  const sizes = cues.map((c) => Math.max(1, c.text.replace(/\s/g, '').length));
  const total = sizes.reduce((a, b) => a + b, 0);
  const upto = sizes.slice(0, ci).reduce((a, b) => a + b, 0) + sizes[ci] / 2;
  const frac = upto / total;
  const ssz = sentences.map((s) => Math.max(1, s.replace(/\s/g, '').length));
  const stotal = ssz.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < sentences.length; i++) {
    acc += ssz[i];
    if (frac <= acc / stotal) return i;
  }
  return sentences.length - 1;
}

/** 목소리 파일이 없을 때: 글자 수 비율로 문장별 시간을 나눈 자막 큐 */
export function estimateCues(text: string, duration: number): Cue[] {
  const sents = splitSentences(text);
  const sizes = sents.map((s) => Math.max(1, s.replace(/\s/g, '').length));
  const total = sizes.reduce((a, b) => a + b, 0);
  let t = 0;
  return sents.map((s, i) => {
    const d = (duration * sizes[i]) / total;
    const cue = { start: t, end: t + d, text: s };
    t += d;
    return cue;
  });
}
