// 샘플 동화책 표지·페이지 삽화 생성기
// - 외부 이미지·유료 AI API를 쓰지 않고, 책마다 정해 둔 색·장면·주인공으로 SVG를 그린 뒤 PNG로 저장한다.
// - 결과물은 storage/books/<bookId>/cover.png, page-01.png ... (Object Storage 대용 로컬 폴더)
// 실행: pnpm --filter @storybook/api art
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, '../src/seed/storybooks.json'), 'utf8'));
const outRoot = join(here, '../storage/books');

// 같은 입력이면 항상 같은 그림이 나오도록 하는 간단한 난수
function rng(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const eye = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2D2A32"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;
const cheek = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="5" fill="#FF9AA2" opacity="0.7"/>`;
const smile = (x, y, w = 10) => `<path d="M${x - w / 2} ${y} Q${x} ${y + w * 0.7} ${x + w / 2} ${y}" stroke="#2D2A32" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const face = (x, y, gap = 16) => eye(x - gap, y) + eye(x + gap, y) + cheek(x - gap - 8, y + 14) + cheek(x + gap + 8, y + 14) + smile(x, y + 14);

function character(kind, color, accent, cx, cy, s) {
  const g = (inner) => `<g transform="translate(${cx} ${cy}) scale(${s})">${inner}</g>`;
  const out = '#5B4636';
  switch (kind) {
    case 'rabbit':
      return g(`
        <ellipse cx="-18" cy="-92" rx="13" ry="40" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="18" cy="-92" rx="13" ry="40" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="-18" cy="-90" rx="6" ry="28" fill="#FFC9D0"/><ellipse cx="18" cy="-90" rx="6" ry="28" fill="#FFC9D0"/>
        <ellipse cx="0" cy="40" rx="46" ry="42" fill="${color}" stroke="${out}" stroke-width="3"/>
        <circle cx="0" cy="-30" r="44" fill="${color}" stroke="${out}" stroke-width="3"/>
        ${face(0, -32)}
        <path d="M-30 30 Q0 50 30 30" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
    case 'bear':
      return g(`
        <circle cx="-34" cy="-66" r="17" fill="${color}" stroke="${out}" stroke-width="3"/><circle cx="34" cy="-66" r="17" fill="${color}" stroke="${out}" stroke-width="3"/>
        <circle cx="-34" cy="-66" r="8" fill="#E8C5A8"/><circle cx="34" cy="-66" r="8" fill="#E8C5A8"/>
        <ellipse cx="0" cy="42" rx="50" ry="44" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="48" rx="28" ry="26" fill="#E8C5A8"/>
        <circle cx="0" cy="-28" r="46" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="-14" rx="18" ry="13" fill="#E8C5A8"/><ellipse cx="0" cy="-20" rx="7" ry="5" fill="#2D2A32"/>
        ${eye(-17, -36)}${eye(17, -36)}${cheek(-30, -18)}${cheek(30, -18)}
        <rect x="-50" y="8" width="100" height="10" rx="5" fill="${accent}"/>`);
    case 'squirrel':
      return g(`
        <path d="M40 60 C110 40 110 -60 60 -70 C30 -74 30 -30 55 -25 C80 -20 70 30 40 40 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="40" rx="40" ry="42" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="48" rx="22" ry="26" fill="#F3D9B1"/>
        <path d="M-34 -62 L-26 -96 L-10 -66 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M34 -62 L26 -96 L10 -66 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <circle cx="0" cy="-30" r="40" fill="${color}" stroke="${out}" stroke-width="3"/>
        ${face(0, -32, 14)}
        <ellipse cx="-30" cy="30" rx="14" ry="12" fill="${accent}"/><path d="M-40 22 Q-30 12 -20 22" stroke="#6B4226" stroke-width="5" fill="none"/>`);
    case 'fox':
      return g(`
        <path d="M38 50 C120 40 120 -40 80 -40 C70 0 60 20 38 30 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M108 -10 C116 -30 96 -42 80 -40 C86 -28 96 -18 108 -10 Z" fill="#fff"/>
        <ellipse cx="0" cy="42" rx="40" ry="42" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="50" rx="20" ry="26" fill="#FFF4E6"/>
        <path d="M-40 -50 L-34 -100 L-6 -66 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M40 -50 L34 -100 L6 -66 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M-46 -34 Q0 -90 46 -34 Q40 10 0 12 Q-40 10 -46 -34 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M-30 -14 Q0 24 30 -14 Q16 6 0 8 Q-16 6 -30 -14 Z" fill="#FFF4E6"/>
        ${eye(-16, -30)}${eye(16, -30)}<ellipse cx="0" cy="-8" rx="6" ry="4" fill="#2D2A32"/>
        <path d="M-26 18 L0 30 L26 18" stroke="${accent}" stroke-width="8" fill="none" stroke-linejoin="round"/>`);
    case 'owl':
      return g(`
        <path d="M-46 -40 L-40 -86 L-18 -58 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M46 -40 L40 -86 L18 -58 Z" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="10" rx="56" ry="76" fill="${color}" stroke="${out}" stroke-width="3"/>
        <ellipse cx="0" cy="34" rx="34" ry="42" fill="#EBD9C8"/>
        <path d="M-20 22 q5 6 10 0 M0 34 q5 6 10 0 M-12 48 q5 6 10 0" stroke="#B99B84" stroke-width="3" fill="none"/>
        <circle cx="-22" cy="-24" r="20" fill="#fff" stroke="${out}" stroke-width="3"/><circle cx="22" cy="-24" r="20" fill="#fff" stroke="${out}" stroke-width="3"/>
        ${eye(-22, -24, 9)}${eye(22, -24, 9)}
        <path d="M-7 -6 L7 -6 L0 6 Z" fill="${accent}"/>
        <ellipse cx="-58" cy="16" rx="14" ry="36" fill="${color}" stroke="${out}" stroke-width="3"/><ellipse cx="58" cy="16" rx="14" ry="36" fill="${color}" stroke="${out}" stroke-width="3"/>`);
    case 'turtle':
      return g(`
        <ellipse cx="-44" cy="40" rx="16" ry="12" fill="${color}" stroke="${out}" stroke-width="3"/><ellipse cx="44" cy="40" rx="16" ry="12" fill="${color}" stroke="${out}" stroke-width="3"/>
        <circle cx="74" cy="0" r="30" fill="${color}" stroke="${out}" stroke-width="3"/>
        ${eye(66, -6)}${eye(86, -6)}${cheek(64, 10)}${smile(78, 10, 8)}
        <path d="M-70 30 Q-70 -60 0 -60 Q70 -60 70 30 Z" fill="#6A994E" stroke="${out}" stroke-width="3"/>
        <path d="M-30 -30 L0 -46 L30 -30 L30 4 L0 16 L-30 4 Z" fill="${accent}" opacity="0.85"/>
        <path d="M-70 30 L70 30" stroke="${out}" stroke-width="3"/>`);
    case 'cloud':
      return g(`
        <path d="M-80 30 C-110 30 -110 -20 -76 -22 C-80 -70 -20 -80 -6 -46 C10 -90 80 -70 70 -22 C110 -24 110 30 80 30 Z" fill="${color}" stroke="#9DB4C8" stroke-width="4"/>
        ${face(0, -6, 20)}
        <rect x="40" y="20" width="44" height="32" rx="4" fill="${accent}" stroke="${out}" stroke-width="3"/>
        <path d="M40 22 L62 40 L84 22" stroke="${out}" stroke-width="3" fill="none"/>`);
    case 'snowman':
      return g(`
        <circle cx="0" cy="44" r="56" fill="#fff" stroke="#A9C1D9" stroke-width="4"/>
        <circle cx="0" cy="-42" r="40" fill="#fff" stroke="#A9C1D9" stroke-width="4"/>
        ${eye(-14, -50)}${eye(14, -50)}${cheek(-24, -34)}${cheek(24, -34)}
        <path d="M0 -40 L30 -34 L0 -30 Z" fill="#F4A259"/>
        <path d="M-40 -8 Q0 8 40 -8 L40 6 Q0 22 -40 6 Z" fill="${accent}"/>
        <rect x="18" y="0" width="14" height="40" rx="5" fill="${accent}"/>
        <circle cx="0" cy="30" r="5" fill="#2D2A32"/><circle cx="0" cy="52" r="5" fill="#2D2A32"/>`);
    case 'bee':
      return g(`
        <ellipse cx="-24" cy="-50" rx="30" ry="22" fill="#E6F4FF" stroke="#9DB4C8" stroke-width="3" opacity="0.95"/>
        <ellipse cx="24" cy="-50" rx="30" ry="22" fill="#E6F4FF" stroke="#9DB4C8" stroke-width="3" opacity="0.95"/>
        <ellipse cx="0" cy="0" rx="62" ry="46" fill="${color}" stroke="${out}" stroke-width="3"/>
        <path d="M-22 -42 Q-30 0 -22 42 M8 -46 Q0 0 8 46" stroke="#3D3027" stroke-width="12" fill="none"/>
        <circle cx="-56" cy="-4" r="30" fill="${color}" stroke="${out}" stroke-width="3"/>
        ${eye(-66, -10)}${eye(-46, -10)}${cheek(-72, 6)}${smile(-56, 6, 8)}
        <path d="M-64 -32 Q-74 -56 -82 -58 M-50 -32 Q-46 -58 -38 -60" stroke="${out}" stroke-width="3" fill="none"/>
        <path d="M62 0 L78 0" stroke="${out}" stroke-width="4"/>
        <circle cx="-82" cy="-58" r="5" fill="${accent}"/><circle cx="-38" cy="-60" r="5" fill="${accent}"/>`);
    default:
      return g(`<circle r="50" fill="${color}"/>${face(0, -6)}`);
  }
}

function scene(art, w, h, r, progress) {
  const [top, bottom] = art.sky;
  const groundY = h * 0.72;
  let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`;
  s += `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  // 해·달은 페이지가 넘어갈수록 하늘을 가로질러 움직인다
  const arcX = w * (0.15 + 0.7 * progress);
  const arcY = h * (0.28 - 0.14 * Math.sin(Math.PI * progress));
  const night = art.scene === 'night';
  if (night) {
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * groundY * 0.9, rr = 1 + r() * 2.6;
      s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#FFF8D6" opacity="${0.5 + r() * 0.5}"/>`;
    }
    s += `<circle cx="${arcX}" cy="${arcY}" r="${h * 0.09}" fill="${art.accent}"/><circle cx="${arcX + h * 0.04}" cy="${arcY - h * 0.02}" r="${h * 0.08}" fill="${top}" opacity="0.0"/>`;
    s += `<circle cx="${arcX}" cy="${arcY}" r="${h * 0.13}" fill="${art.accent}" opacity="0.15"/>`;
  } else {
    s += `<circle cx="${arcX}" cy="${arcY}" r="${h * 0.12}" fill="#FFE29A" opacity="0.45"/><circle cx="${arcX}" cy="${arcY}" r="${h * 0.08}" fill="#FFD166"/>`;
    for (let i = 0; i < 3; i++) {
      const x = r() * w, y = h * (0.08 + r() * 0.3), k = 0.6 + r() * 0.8;
      s += `<g transform="translate(${x} ${y}) scale(${k})" opacity="0.95"><ellipse cx="0" cy="0" rx="46" ry="20" fill="#fff"/><circle cx="-18" cy="-12" r="20" fill="#fff"/><circle cx="14" cy="-16" r="24" fill="#fff"/></g>`;
    }
  }
  if (art.scene === 'sky' && art.character === 'fox') {
    const colors = ['#FF595E', '#FF924C', '#FFCA3A', '#8AC926', '#1982C4', '#4267AC', '#6A4C93'];
    colors.forEach((c, i) => {
      s += `<path d="M${w * 0.05} ${groundY} A${w * 0.45 - i * 10} ${h * 0.55 - i * 10} 0 0 1 ${w * 0.95} ${groundY}" stroke="${c}" stroke-width="10" fill="none" opacity="0.75" transform="translate(0 ${i * 0})"/>`.replace(`A${w * 0.45 - i * 10}`, `A${w * 0.45 - i * 10}`);
    });
  }
  // 바닥
  if (art.scene === 'sea') {
    s += `<rect y="${h * 0.5}" width="${w}" height="${h * 0.3}" fill="#5FB4D9"/>`;
    for (let i = 0; i < 5; i++) {
      const y = h * (0.52 + i * 0.05);
      s += `<path d="M0 ${y} ${Array.from({ length: 12 }, (_, k) => `Q${(k + 0.5) * w / 12} ${y - 8} ${(k + 1) * w / 12} ${y}`).join(' ')}" stroke="#E8F7FF" stroke-width="3" fill="none" opacity="0.7"/>`;
    }
    s += `<path d="M0 ${groundY} Q${w * 0.5} ${groundY - 30} ${w} ${groundY} L${w} ${h} L0 ${h} Z" fill="${art.ground}"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="${r() * w}" cy="${groundY + 20 + r() * (h - groundY - 30)}" r="${3 + r() * 4}" fill="#E7C08A"/>`;
  } else {
    s += `<path d="M0 ${groundY} Q${w * 0.25} ${groundY - 50} ${w * 0.5} ${groundY - 10} T${w} ${groundY - 20} L${w} ${h} L0 ${h} Z" fill="${art.ground}"/>`;
    s += `<path d="M0 ${groundY + 30} Q${w * 0.4} ${groundY} ${w} ${groundY + 40} L${w} ${h} L0 ${h} Z" fill="${art.ground}" opacity="0.6" style="mix-blend-mode:multiply"/>`;
  }
  if (art.scene === 'forest' || art.scene === 'snow') {
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.5) * w / 5 + (r() - 0.5) * 40;
      if (Math.abs(x - w * 0.5) < w * 0.16) continue;
      const th = h * (0.22 + r() * 0.1), base = groundY + 6;
      const leaf = art.scene === 'snow' ? '#2F6F4F' : ['#5A9E4B', '#7BB662', '#E9A23B'][Math.floor(r() * 3)];
      s += `<rect x="${x - 6}" y="${base - th * 0.3}" width="12" height="${th * 0.3}" fill="#7A5232"/>`;
      s += `<path d="M${x} ${base - th} L${x + th * 0.32} ${base - th * 0.25} L${x - th * 0.32} ${base - th * 0.25} Z" fill="${leaf}"/>`;
      if (art.scene === 'snow') s += `<path d="M${x} ${base - th} L${x + th * 0.12} ${base - th * 0.72} L${x - th * 0.12} ${base - th * 0.72} Z" fill="#fff"/>`;
    }
  }
  if (art.scene === 'garden' || (art.scene === 'snow' && progress > 0.6)) {
    const n = art.scene === 'snow' ? Math.round(progress * 10) : 10;
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = groundY + 18 + r() * (h - groundY - 30);
      const petal = art.scene === 'snow' ? art.accent : ['#FF6F91', '#FFC75F', '#9B5DE5', '#F15BB5', '#FF9671'][Math.floor(r() * 5)];
      s += `<path d="M${x} ${y} L${x} ${y + 22}" stroke="#4E8F3A" stroke-width="3"/>`;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        s += `<circle cx="${x + Math.cos(a) * 7}" cy="${y + Math.sin(a) * 7}" r="6" fill="${petal}"/>`;
      }
      s += `<circle cx="${x}" cy="${y}" r="5" fill="#FFE066"/>`;
    }
  }
  if (art.scene === 'snow') {
    for (let i = 0; i < Math.round(30 * (1 - progress)); i++) s += `<circle cx="${r() * w}" cy="${r() * h}" r="${2 + r() * 3}" fill="#fff" opacity="0.9"/>`;
  }
  return { svg: s, groundY };
}

function render(svg, w, h, file) {
  const png = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`, { fitTo: { mode: 'original' } }).render().asPng();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
}

let count = 0;
for (const book of seed.books) {
  const { art } = book;
  // 표지 (세로 3:4)
  {
    const w = 600, h = 800, r = rng(book.id + 'cover');
    const { svg, groundY } = scene(art, w, h, r, 0.75);
    const frame = `<rect x="18" y="18" width="${w - 36}" height="${h - 36}" rx="28" fill="none" stroke="#fff" stroke-width="8" opacity="0.85"/>`;
    render(svg + character(art.character, art.color, art.accent, w * 0.5, groundY - 40, 1.9) + frame, w, h, join(outRoot, book.id, 'cover.png'));
    count++;
  }
  // 페이지 (가로 4:3)
  book.pages.forEach((_, i) => {
    const w = 800, h = 600, r = rng(`${book.id}-p${i}`);
    const progress = book.pages.length > 1 ? i / (book.pages.length - 1) : 0.5;
    const { svg, groundY } = scene(art, w, h, r, progress);
    const cx = w * (0.25 + 0.5 * r());
    // 눈사람은 봄이 올수록 조금씩 작아진다 (이야기 내용과 맞춤)
    const scale = art.character === 'snowman' ? 1.35 - 0.55 * progress : 1.05 + r() * 0.35;
    render(svg + character(art.character, art.color, art.accent, cx, groundY - 30, scale), w, h, join(outRoot, book.id, `page-${String(i + 1).padStart(2, '0')}.png`));
    count++;
  });
}
console.log(`삽화 ${count}장 생성 완료 → ${outRoot}`);
