import test from 'node:test';
import assert from 'node:assert/strict';
import { easings, motionFor, cameraAt, particlesAt, hashSeed, seeded, MAX_PARTICLES, estimateDuration } from '../src/motion/engine.ts';
import { splitSentences, activeCueIndex, activeSentenceIndex } from '../src/motion/captions.ts';

const BOOK = 'b0000001-5b00-4c00-8000-000000000001';

test('easing 끝점은 0과 1', () => {
  for (const [k, f] of Object.entries(easings)) {
    assert.ok(Math.abs(f(0)) < 1e-9, `${k}(0)`);
    assert.ok(Math.abs(f(1) - 1) < 1e-9, `${k}(1)`);
  }
});

test('같은 책·쪽이면 항상 같은 모션, 다른 쪽이면 카메라가 달라짐', () => {
  assert.deepEqual(motionFor(BOOK, 3), motionFor(BOOK, 3));
  for (let p = 1; p < 8; p++) assert.notEqual(motionFor(BOOK, p).camera, motionFor(BOOK, p + 1).camera);
});

test('카메라: 위치만으로 결정(되감기 해도 같음), 일시정지(t 고정)면 안 움직임', () => {
  const c = motionFor(BOOK, 2);
  const a = cameraAt(c, 4.2, 12);
  cameraAt(c, 9, 12);
  cameraAt(c, 1, 12);
  assert.deepEqual(cameraAt(c, 4.2, 12), a);
});

test('카메라: 시작/끝 값과 확대 범위', () => {
  const zi = { ...motionFor(BOOK, 1), camera: 'zoomIn' as const };
  assert.ok(Math.abs(cameraAt(zi, 0, 10).scale - 1) < 1e-9);
  assert.ok(Math.abs(cameraAt(zi, 10, 10).scale - 1.09) < 1e-9);
  assert.ok(Math.abs(cameraAt(zi, 99, 10).scale - 1.09) < 1e-9, '길이를 넘어도 끝값 유지');
  const zo = { ...zi, camera: 'zoomOut' as const };
  assert.ok(Math.abs(cameraAt(zo, 0, 10).scale - 1.09) < 1e-9);
  for (let t = 0; t <= 20; t += 0.5) {
    const tr = cameraAt(zi, t, 10);
    assert.ok(Math.abs(tr.ty) <= 0.013 && Math.abs(tr.rotateDeg) <= 0.71);
  }
});

test('카메라: dur=0이어도 NaN이 안 나옴', () => {
  const tr = cameraAt(motionFor(BOOK, 1), 0, 0);
  for (const v of Object.values(tr)) assert.ok(Number.isFinite(v));
});

test('모션 줄이기: 확대·이동·기울기 없음, 입자 없음', () => {
  const c = motionFor(BOOK, 1);
  for (const t of [0, 2.5, 5, 10, 99]) assert.deepEqual(cameraAt(c, t, 10, true), { scale: 1, tx: 0, ty: 0, rotateDeg: 0 });
  assert.equal(particlesAt(c, 3, true).length, 0);
});

test('입자: 최대 30개, 같은 t면 같은 위치, 범위 안', () => {
  const c = { ...motionFor(BOOK, 1), particleCount: 999 };
  const ps = particlesAt(c, 7.7);
  assert.equal(ps.length, MAX_PARTICLES);
  assert.deepEqual(particlesAt(c, 7.7), ps);
  for (const kind of ['sparkle', 'snow'] as const) {
    for (let t = 0; t < 60; t += 3.3) {
      for (const p of particlesAt({ ...c, particles: kind }, t)) {
        assert.ok(p.x > -0.05 && p.x < 1.05 && p.y >= 0 && p.y <= 1, `${kind} 범위`);
        assert.ok(p.opacity >= 0 && p.opacity <= 1 && p.size > 0);
      }
    }
  }
});

test('난수는 씨앗이 같으면 같고 hashSeed는 안정적', () => {
  const a = seeded(5), b = seeded(5);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(hashSeed('abc'), hashSeed('abc'));
  assert.notEqual(hashSeed('abc'), hashSeed('abd'));
});

test('문장 나누기: 따옴표·물음표 처리', () => {
  const s = splitSentences('보름달이 뜬 밤, 토리는 눈을 깜빡였어요. "오늘은 왜 잠이 안 올까?" 토리가 중얼거렸어요.');
  assert.equal(s.length, 3);
  assert.ok(s[1].startsWith('"오늘은') && s[1].endsWith('?"'));
  assert.deepEqual(splitSentences('마침표 없는 글'), ['마침표 없는 글']);
});

test('자막: 시간 → 문장 (앞·중간·끝·되감기)', () => {
  const cues = [
    { start: 0.35, end: 4, text: 'a' },
    { start: 4, end: 6, text: 'b' },
    { start: 6, end: 9, text: 'c' },
  ];
  assert.equal(activeCueIndex(cues, 0), 0);
  assert.equal(activeCueIndex(cues, 3.99), 0);
  assert.equal(activeCueIndex(cues, 4), 1);
  assert.equal(activeCueIndex(cues, 100), 2);
  assert.equal(activeCueIndex(cues, 5), 1);
  assert.equal(activeCueIndex([], 5), -1);
  const sents = ['a.', 'b.', 'c.'];
  assert.equal(activeSentenceIndex(sents, cues, 7), 2);
  // 개수가 다르면 글자 비율로 매핑 (끝에서는 마지막 문장)
  assert.equal(activeSentenceIndex(['x', 'y'], cues, 100), 1);
  assert.equal(activeSentenceIndex(['x', 'y'], cues, 0), 0);
  assert.equal(activeSentenceIndex(sents, [], 1), -1);
});

test('목소리 없는 쪽 길이 추정은 6~40초', () => {
  assert.equal(estimateDuration('짧아'), 6);
  assert.equal(estimateDuration('가'.repeat(1000)), 40);
});

test('목소리 없을 때 추정 자막: 전체 길이를 덮고 순서대로', async () => {
  const { estimateCues } = await import('../src/motion/captions.ts');
  const cues = estimateCues('하나예요. 둘이에요! 셋이에요?', 12);
  assert.equal(cues.length, 3);
  assert.equal(cues[0].start, 0);
  assert.ok(Math.abs(cues[2].end - 12) < 1e-9);
  for (let i = 1; i < cues.length; i++) assert.ok(Math.abs(cues[i].start - cues[i - 1].end) < 1e-9);
});
