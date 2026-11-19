// 앱 아이콘·스플래시·파비콘 생성 (실행: node scripts/generate-icons.mjs, apps/mobile 폴더에서)
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
const rabbit = (cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s})">
 <ellipse cx="-18" cy="-92" rx="13" ry="40" fill="#F3E9DC" stroke="#5B4636" stroke-width="3"/><ellipse cx="18" cy="-92" rx="13" ry="40" fill="#F3E9DC" stroke="#5B4636" stroke-width="3"/>
 <ellipse cx="-18" cy="-90" rx="6" ry="28" fill="#FFC9D0"/><ellipse cx="18" cy="-90" rx="6" ry="28" fill="#FFC9D0"/>
 <circle cx="0" cy="-30" r="44" fill="#F3E9DC" stroke="#5B4636" stroke-width="3"/>
 <circle cx="-16" cy="-32" r="5" fill="#2D2A32"/><circle cx="16" cy="-32" r="5" fill="#2D2A32"/>
 <ellipse cx="-26" cy="-16" rx="8" ry="5" fill="#FF9AA2" opacity="0.7"/><ellipse cx="26" cy="-16" rx="8" ry="5" fill="#FF9AA2" opacity="0.7"/>
 <path d="M-5 -18 Q0 -11 5 -18" stroke="#2D2A32" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
const book = (cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s})">
 <path d="M0 0 C-40 -18 -90 -18 -120 -6 L-120 70 C-90 58 -40 58 0 76 Z" fill="#FFFFFF" stroke="#C9611D" stroke-width="6" stroke-linejoin="round"/>
 <path d="M0 0 C40 -18 90 -18 120 -6 L120 70 C90 58 40 58 0 76 Z" fill="#FFFFFF" stroke="#C9611D" stroke-width="6" stroke-linejoin="round"/>
 <path d="M-96 14 C-70 6 -40 6 -20 14 M-96 34 C-70 26 -40 26 -20 34 M20 14 C40 6 70 6 96 14 M20 34 C40 26 70 26 96 34" stroke="#F0C9A6" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
const star = (x,y,r)=>`<path transform="translate(${x} ${y}) scale(${r})" d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.2 L6.5 8.1 L0 4 L-6.5 8.1 L-4.3 1.2 L-10 -3.1 L-2.9 -3.1 Z" fill="#FFD166"/>`;
const art = (s=1) => rabbit(512, 520, 3.2*s) + book(512, 640, 2.6*s) + star(250,260,3.2) + star(790,230,2.4) + star(820,420,1.6);
const svg = (w,h,body,bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 1024">${bg?`<rect width="1024" height="1024" fill="${bg}"/>`:''}${body}</svg>`;
const out = (name, s, size) => writeFileSync(name, new Resvg(s, { fitTo: { mode: 'width', value: size } }).render().asPng());
out('assets/icon.png', svg(1024,1024,`<rect width="1024" height="1024" fill="#FFE3C4"/><circle cx="512" cy="560" r="400" fill="#FFF8EE"/>`+art(),null), 1024);
out('assets/android-icon-foreground.png', svg(1024,1024,`<g transform="translate(512 512) scale(0.72) translate(-512 -540)">${art()}</g>`,null), 1024);
out('assets/android-icon-background.png', svg(1024,1024,'', '#FFF1DE'), 1024);
out('assets/android-icon-monochrome.png', svg(1024,1024,`<g transform="translate(512 512) scale(0.72) translate(-512 -540)" filter="url(#m)">${art()}</g><defs><filter id="m"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter></defs>`,null), 1024);
out('assets/splash-icon.png', svg(1024,1024,art(),null), 1024);
out('assets/favicon.png', svg(1024,1024,`<rect width="1024" height="1024" rx="220" fill="#FFE3C4"/>`+art(),null), 64);
console.log('icons ok');
