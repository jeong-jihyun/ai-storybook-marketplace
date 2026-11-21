import test from 'node:test';
import assert from 'node:assert/strict';
import { easings, motionFor, cameraAt, particlesAt, hashSeed, narrationMatchesText, layerState, seeded, MAX_PARTICLES, estimateDuration } from '../src/motion/engine.ts';
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

test('글이 고쳐져 textHash 가 다르면 음성을 쓰지 않는다 (파이썬 gen.py 와 같은 해시)', () => {
  // gen.py 로 계산한 값 (UTF-16 코드 단위 FNV-1a): 이모지 포함 문장
  const t = '관리자가 고친 셋째 쪽이에요. 이모지 🌙 도 있어요.';
  assert.equal(hashSeed(t), 2339200868);
  assert.ok(narrationMatchesText(hashSeed('원래 글'), '원래 글'));
  assert.equal(narrationMatchesText(hashSeed('원래 글'), '고친 글'), false);
  assert.ok(narrationMatchesText(hashSeed('원래 글'), undefined)); // 글을 안 주면 확인하지 않음
  assert.ok(narrationMatchesText(undefined, '아무 글')); // 옛 매니페스트는 그대로 사용
});

test('관리자 움직임 설정: 끄면 정지, 카메라·반짝이 고정, auto 는 원래대로', () => {
  const base = motionFor(BOOK, 3);
  assert.deepEqual(motionFor(BOOK, 3, { enabled: true, camera: 'auto', particles: 'auto' }), base);
  const off = motionFor(BOOK, 3, { enabled: false, camera: 'zoomIn', particles: 'snow' });
  assert.equal(off.camera, 'still');
  assert.equal(particlesAt(off, 4).length, 0);
  const c = cameraAt(off, 5, 20, false);
  assert.equal(c.scale, 1);
  assert.ok(c.tx === 0 && Math.abs(c.ty) === 0 && Math.abs(c.rotateDeg) === 0);
  assert.equal(motionFor(BOOK, 3, { enabled: true, camera: 'panLeft', particles: 'none' }).camera, 'panLeft');
  assert.equal(particlesAt(motionFor(BOOK, 3, { enabled: true, camera: 'auto', particles: 'none' }), 4).length, 0);
  const still = motionFor(BOOK, 3, { enabled: true, camera: 'still', particles: 'auto' });
  assert.equal(cameraAt(still, 5, 20, false).scale, 1);
});

test('층 움직임: 둥실·살랑·깜빡임·슬라이드·점점 켜짐', () => {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  // bob: 주기의 1/4 지점에서 최대
  assert.ok(near(layerState([{ kind: 'bob', amp: 0.02, period: 4 }], 1, 10).ty, 0.02));
  assert.ok(near(layerState([{ kind: 'sway', amp: 5, period: 4 }], 1, 10).rotateDeg, 5));
  // 깜빡임: 주기 시작 0.16초 동안만 보임
  const blink = [{ kind: 'blink' as const, period: 4, dur: 0.2 }];
  assert.equal(layerState(blink, 0.1, 10).opacity, 1);
  assert.equal(layerState(blink, 1.0, 10).opacity, 0);
  assert.equal(layerState(blink, 4.1, 10).opacity, 1);
  // 슬라이드: 시작 전 from, 끝난 뒤 to, 가운데는 중간값
  const sl = [{ kind: 'slide' as const, from: [-0.5, 0] as [number, number], to: [0, 0] as [number, number], start: 0, end: 0.5 }];
  assert.equal(layerState(sl, 0, 10).tx, -0.5);
  assert.ok(near(layerState(sl, 2.5, 10).tx, -0.25));
  assert.equal(layerState(sl, 9, 10).tx, 0);
  // ramp: 눈꺼풀이 점점 내려옴 (투명 → 불투명)
  const ramp = [{ kind: 'ramp' as const, start: 0.2, end: 0.8, opFrom: 0, opTo: 1 }];
  assert.equal(layerState(ramp, 1, 10).opacity, 0);
  assert.ok(near(layerState(ramp, 5, 10).opacity, 0.5));
  assert.equal(layerState(ramp, 9.5, 10).opacity, 1);
  // rise: 한 바퀴 시작·끝은 투명, 가운데는 보이고 위로 올라감
  const rise = [{ kind: 'rise' as const, amp: 0.2, period: 4 }];
  assert.ok(near(layerState(rise, 0, 10).opacity, 0));
  assert.ok(near(layerState(rise, 2, 10).opacity, 1) && near(layerState(rise, 2, 10).ty, -0.1));
  // 같은 시각 → 같은 결과 (되감기), 여러 움직임은 겹침
  const both = [{ kind: 'bob' as const, amp: 0.01, period: 3 }, { kind: 'sway' as const, amp: 2, period: 5 }];
  assert.deepEqual(layerState(both, 1.7, 8), layerState(both, 1.7, 8));
  // 바퀴: end 이후에는 멈춤
  const spin = [{ kind: 'spin' as const, period: 2, end: 0.5 }];
  assert.ok(near(layerState(spin, 1, 10).rotateDeg, 180));
  assert.equal(layerState(spin, 5, 10).rotateDeg, layerState(spin, 9, 10).rotateDeg);
  // 모션 줄이기: 가만히, 깜빡임·올라감 층은 숨김
  const r = layerState([...both, ...blink, ...rise], 2, 8, true);
  assert.ok(r.tx === 0 && r.ty === 0 && r.rotateDeg === 0 && r.scale === 1 && r.opacity === 0);
});
