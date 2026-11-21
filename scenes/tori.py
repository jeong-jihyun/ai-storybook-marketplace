"""'달빛 기차를 탄 토끼 토리' 8쪽 장면을 층(투명 PNG)으로 그린다.
실행:  python3 scenes/tori.py   →  apps/api/storage/books/<id>/scene/*.png  +  apps/api/src/seed/scenes.json
다시 실행해도 같은 결과(무작위도 고정 씨앗)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE = os.path.join(ROOT, "apps/api/storage")
SCENES_JSON = os.path.join(ROOT, "apps/api/src/seed/scenes.json")
BOOK = "b0000001-5b00-4c00-8000-000000000001"


def base_sky(sc, top="#1b2556", bot="#46559a", n=70, seed=1, ymax=380):
    s, d = sky(top, bot)
    sc.add("sky", s, defs=d)
    sc.add("stars_a", stars(seed, n, ymax), [{"kind": "twinkle", "amp": 0.65, "period": 3.4, "phase": 0.0}])
    sc.add("stars_b", stars(seed + 50, n // 2, ymax, 1.2, 3.0), [{"kind": "twinkle", "amp": 0.7, "period": 4.6, "phase": 0.45}])


def ground(sc, color="#232d57", y=470, far="#2e3a74"):
    sc.add("hills_far", hills(far, y - 60, 40, 3), [{"kind": "drift", "dx": -0.015}])
    sc.add("ground", f'<rect x="0" y="{y}" width="{W}" height="{H-y}" fill="{color}"/>' + hills(color, y, 12, 5))


def bedroom(sc, closed, face):
    """1쪽·8쪽 공통: 달이 보이는 창문 + 침대 + 토리"""
    win = (470, 90, 260, 240)
    wx, wy, ww, wh = win
    s, d = sky("#1b2556", "#46559a")
    sc.add("win_sky", f'<g clip-path="url(#wc)">{s.replace(f"""width="{W}" height="{H}" """, f"""x="{wx}" y="{wy}" width="{ww}" height="{wh}" """)}</g>',
           defs=d + f'<clipPath id="wc"><rect x="{wx}" y="{wy}" width="{ww}" height="{wh}"/></clipPath>')
    sc.add("win_stars", stars(11, 26, 320, 0.8, 2.2, xmin=wx + 6, xmax=wx + ww - 6).replace('cy="8', 'cy="100'),
           [{"kind": "twinkle", "amp": 0.7, "period": 3.2}])
    sc.add("moon", moon(612, 205, 40 if not face else 50, face=face), [{"kind": "bob", "amp": 0.006, "period": 7}, {"kind": "breathe", "amp": 0.012, "period": 5}], defs=MOON_DEFS)
    wall = (f'<path fill-rule="evenodd" d="M0 0H{W}V{H}H0Z M{wx} {wy}H{wx+ww}V{wy+wh}H{wx}Z" fill="#343a74"/>'
            + "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#434a8c"/>' for x in range(30, 800, 70) for y in range(30, 470, 70))
            + f'<rect x="0" y="470" width="{W}" height="{H-470}" fill="#4a3b55"/><rect x="0" y="466" width="{W}" height="8" fill="#5d4a66"/>'
            + '<ellipse cx="300" cy="545" rx="260" ry="34" fill="#6a4f78" opacity=".7"/>')
    sc.add("room", wall)
    sc.add("win_frame", f'<rect x="{wx-8}" y="{wy-8}" width="{ww+16}" height="{wh+16}" rx="6" fill="none" stroke="#8a6b4a" stroke-width="14"/>'
           f'<path d="M{wx+ww/2} {wy} V{wy+wh} M{wx} {wy+wh/2} H{wx+ww}" stroke="#8a6b4a" stroke-width="8"/><rect x="{wx-22}" y="{wy+wh+8}" width="{ww+44}" height="14" rx="5" fill="#9b7a54"/>')
    sc.add("curtains", f'<path d="M{wx-22} {wy-14} H{wx+60} Q{wx+30} {wy+120} {wx+58} {wy+wh+10} H{wx-22} Z" fill="#d86f7f" stroke="#a84d5d" stroke-width="3"/>'
           f'<path d="M{wx+ww+22} {wy-14} H{wx+ww-60} Q{wx+ww-30} {wy+120} {wx+ww-58} {wy+wh+10} H{wx+ww+22} Z" fill="#d86f7f" stroke="#a84d5d" stroke-width="3"/>',
           [{"kind": "sway", "amp": 1.4, "period": 6}], wx / W + ww / W / 2, (wy - 14) / H)
    sc.add("bed", '<rect x="56" y="250" width="34" height="230" rx="10" fill="#8a6b4a" stroke="#5f4630" stroke-width="3"/>'
           '<rect x="70" y="420" width="410" height="60" rx="10" fill="#9b7a54" stroke="#5f4630" stroke-width="3"/>'
           '<rect x="90" y="360" width="380" height="64" rx="22" fill="#eef1ff" stroke="#b9c2e6" stroke-width="3"/>'
           '<ellipse cx="172" cy="372" rx="84" ry="28" fill="#ffffff" stroke="#c9d0ee" stroke-width="3"/>'
           '<rect x="470" y="400" width="14" height="80" rx="6" fill="#8a6b4a" stroke="#5f4630" stroke-width="3"/>')
    t = Tori(172, 468, 1.0)
    t.add(sc, "tori", body=False, closed=closed, ear_amp=4)
    quilt = "".join(f'<path d="M{x} 392 q16 -14 32 0" stroke="#e8f0ff" stroke-width="2.5" fill="none" opacity=".6"/>' for x in range(172, 470, 34))
    sc.add("blanket", '<path d="M150 398 Q170 384 200 388 L470 392 Q486 394 486 410 L486 452 Q486 468 470 468 L150 468 Q136 468 136 454 L136 412 Q136 400 150 398 Z" fill="#6f8fd8" stroke="#4c6bb3" stroke-width="3"/>'
           + quilt + '<path d="M150 436 H486" stroke="#8fa9e6" stroke-width="3" opacity=".7"/>', [{"kind": "breathe", "amp": 0.012, "period": 4.2}], 0.4, 0.74)
    return sc


def p1():
    sc = Scene()
    bedroom(sc, closed=None, face=False)
    for i, (x, y, ph) in enumerate(((278, 280, 0.0), (332, 236, 0.5))):
        sc.add(f"qmark{i}", qmark(x, y, 0.8 + 0.2 * i), [{"kind": "rise", "amp": 0.14, "period": 4.0, "phase": ph}])
    return sc


def p2():
    sc = Scene()
    base_sky(sc, seed=2)
    sc.add("moon", moon(120, 115, 46), [{"kind": "bob", "amp": 0.006, "period": 8}], defs=MOON_DEFS)
    ground(sc)
    h, light = house(690, 472, 1.35)
    sc.add("house", h)
    sc.add("house_light", light, [{"kind": "twinkle", "amp": 0.25, "period": 3.8}], defs=HOUSE_DEFS)
    body, wheels, chim = train(150, 478, 0.9)
    slide = {"kind": "slide", "from": [-0.62, 0], "to": [0, 0], "start": 0.0, "end": 0.55}
    idle = {"kind": "bob", "amp": 0.003, "period": 1.7, "delay": 4.5}
    sc.add("train", body, [slide, idle], defs=TRAIN_DEFS)
    for i, (w, (cx, cy)) in enumerate(wheels):
        sc.add(f"wheel{i}", w, [slide, idle, {"kind": "spin", "period": 1.3, "end": 0.55}], cx, cy)
    for i, ph in enumerate((0.0, 0.34, 0.68)):
        sc.add(f"smoke{i}", smoke(chim[0], chim[1] - 6, 13 + i * 2), [slide, idle, {"kind": "rise", "amp": 0.28, "period": 3.3, "phase": ph}])
    Tori(595, 478, 0.62, flip=True).add(sc, "tori", ear_amp=5)
    return sc


def p3():
    sc = Scene()
    base_sky(sc, seed=3)
    sc.add("moon", moon(300, 92, 34), [{"kind": "bob", "amp": 0.005, "period": 8}], defs=MOON_DEFS)
    sc.add("platform", f'<rect x="0" y="470" width="{W}" height="{H-470}" fill="#2f3a6e"/><rect x="0" y="466" width="{W}" height="9" fill="#53619f"/>')
    sc.add("carriage", '<rect x="380" y="110" width="440" height="372" rx="18" fill="#cfd8ee" stroke="#5a3e2b" stroke-width="4"/>'
           '<rect x="372" y="96" width="456" height="26" rx="12" fill="#6fb3e0" stroke="#5a3e2b" stroke-width="4"/>'
           '<rect x="460" y="190" width="136" height="292" rx="14" fill="#ffe9a8" stroke="#5a3e2b" stroke-width="4"/>'
           '<rect x="650" y="160" width="90" height="90" rx="14" fill="#ffe08a" stroke="#5a3e2b" stroke-width="4"/>'
           '<rect x="520" y="468" width="120" height="14" fill="#8a6b4a" stroke="#5a3e2b" stroke-width="3"/>'
           '<rect x="380" y="470" width="440" height="14" fill="#26356b"/>')
    sc.add("lamp", '<rect x="96" y="150" width="10" height="322" fill="#53619f" stroke="#5a3e2b" stroke-width="2.5"/><circle cx="101" cy="138" r="86" fill="url(#hl)" opacity=".75"/><circle cx="101" cy="138" r="20" fill="#fff3b0" stroke="#5a3e2b" stroke-width="3"/>',
           [{"kind": "twinkle", "amp": 0.18, "period": 2.6}], 0.126, 0.23, defs=TRAIN_DEFS)
    o = Owl(528, 474, 1.25)
    sc.add("owl_body", o.body(), [{"kind": "bob", "amp": 0.004, "period": 3.2}])
    px, py = o.world(34, -90)
    sc.add("owl_wing", o.wing(), [{"kind": "sway", "amp": 16, "period": 0.9, "burst": 2.4, "gap": 2.6}, {"kind": "bob", "amp": 0.004, "period": 3.2}], px, py)
    hx, hy = o.world(-30, -138)
    sc.add("owl_hat", o.hat(), [{"kind": "sway", "amp": 9, "period": 1.4, "burst": 2.8, "gap": 2.4, "phase": 0.3}, {"kind": "bob", "amp": 0.004, "period": 3.2}], hx, hy)
    sc.add("owl_eyes_closed", o.eyes_closed(), [{"kind": "blink", "period": 4.0, "dur": 0.18, "phase": 0.3}, {"kind": "bob", "amp": 0.004, "period": 3.2}])
    Tori(235, 540, 0.95).add(sc, "tori", ear_amp=6)
    return sc


def p4():
    sc = Scene()
    base_sky(sc, "#2a2260", "#5b5fb0", seed=4, ymax=400)
    sc.add("moon", moon(120, 120, 50), [{"kind": "bob", "amp": 0.006, "period": 8}], defs=MOON_DEFS)
    sc.add("clouds_far", cloud(160, 300, 1.1, "#8c97d6", .7) + cloud(500, 270, 1.3, "#8c97d6", .7) + cloud(690, 340, 0.9, "#8c97d6", .7), [{"kind": "drift", "dx": -0.08}])
    for i, (cx, cy, R, ph) in enumerate(((560, 150, 28, 0.0), (700, 250, 24, 0.4), (440, 90, 20, 0.7))):
        arms = f'<path d="M{cx-R*0.7} {cy+R*0.2} q{-R*0.9} {-R*0.6} {-R*0.6} {-R*1.3} M{cx+R*0.7} {cy+R*0.2} q{R*0.9} {-R*0.6} {R*0.6} {-R*1.3}" stroke="#d9a925" stroke-width="4" fill="none" stroke-linecap="round"/>'
        sc.add(f"star{i}", arms + baby_star(cx, cy, R), [{"kind": "sway", "amp": 11, "period": 1.5, "burst": 3.0, "gap": 1.6, "phase": ph}, {"kind": "bob", "amp": 0.01, "period": 3.6, "phase": ph}], cx / W, cy / H, defs=STAR_GLOW)
    sc.add("clouds_mid", cloud(120, 430, 1.4, "#c3cdf5", .9) + cloud(450, 410, 1.2, "#c3cdf5", .9) + cloud(680, 440, 1.2, "#c3cdf5", .9), [{"kind": "drift", "dx": -0.14}])
    arches = "".join(cloud(x, 505, 1.15, "#e6ebff", .97) for x in range(0, 900, 95))
    sc.add("bridge", f'<rect x="0" y="488" width="{W}" height="12" fill="#dfe6ff"/>' + arches + f'<rect x="0" y="520" width="{W}" height="80" fill="#cfd8ff"/>')
    bob = {"kind": "bob", "amp": 0.004, "period": 1.5}
    body, wheels, chim = train(140, 492, 0.95)
    sc.add("train", body, [bob], defs=TRAIN_DEFS)
    for i, (w, (cx, cy)) in enumerate(wheels):
        sc.add(f"wheel{i}", w, [bob, {"kind": "spin", "period": 1.4}], cx, cy)
    for i, ph in enumerate((0.0, 0.34, 0.68)):
        sc.add(f"smoke{i}", smoke(chim[0], chim[1] - 6, 13 + i * 2), [{"kind": "drift", "dx": -0.1}, {"kind": "rise", "amp": 0.28, "period": 3.4, "phase": ph}])
    Tori(330, 376, 0.46).add(sc, "tori", ear_amp=9, extra=[bob])
    sc.add("clouds_near", cloud(110, 590, 1.7, "#f0f3ff", 1) + cloud(400, 600, 1.8, "#f0f3ff", 1) + cloud(660, 592, 1.5, "#f0f3ff", 1), [{"kind": "drift", "dx": -0.2}])
    return sc


def p5():
    sc = Scene()
    base_sky(sc, "#241d5a", "#4a3f8f", seed=5)
    sc.add("moon", moon(690, 90, 32), [{"kind": "bob", "amp": 0.005, "period": 8}], defs=MOON_DEFS)
    sc.add("ground", cloud(60, 540, 3.2, "#b9b4ec", 1) + cloud(330, 560, 3.4, "#c8c3f2", 1) + cloud(640, 545, 3.3, "#b9b4ec", 1) + f'<rect x="0" y="540" width="{W}" height="60" fill="#c8c3f2"/>')
    spots = ((120, 485, 1.0), (290, 490, 0.9), (500, 488, 1.05), (680, 484, 0.95))
    for i, (x, y, k) in enumerate(spots):
        h, light = house(x, y, k, wall=("#4b4f9a", "#5a4a94", "#44588f", "#58509c")[i])
        sc.add(f"house{i}", h)
        a = 0.12 + i * 0.16
        sc.add(f"light{i}", light, [{"kind": "ramp", "start": a, "end": a + 0.14, "opFrom": 1, "opTo": 0}], defs=HOUSE_DEFS)
    for i, (x, y, k) in enumerate(spots):
        sc.add(f"baby{i}", baby_star(x + (-6 if i % 2 else 8), y - 140 * k - 14, 17, asleep=False), [{"kind": "breathe", "amp": 0.07, "period": 3.2, "phase": i * 0.25}, {"kind": "bob", "amp": 0.006, "period": 4, "phase": i * 0.3}],
               (x + 4) / W, (y - 150 * k) / H, defs=STAR_GLOW)
    sc.add("dim", f'<rect width="{W}" height="{H}" fill="#0f1236"/>', [{"kind": "ramp", "start": 0.1, "end": 0.95, "opFrom": 0.0, "opTo": 0.38}])
    Tori(400, 585, 0.66).add(sc, "tori", ear_amp=6)
    return sc


def p6():
    sc = Scene()
    base_sky(sc, "#17204e", "#3a4688", seed=6)
    sc.add("moon", moon(400, 175, 86), [{"kind": "breathe", "amp": 0.012, "period": 6}], defs=MOON_DEFS)
    ground(sc, "#1f2850", 480, "#2c376f")
    bob = {"kind": "bob", "amp": 0.006, "period": 4.2}
    t = Tori(330, 535, 1.1)
    t.add(sc, "tori", closed="static", ear_amp=3, extra=[bob])
    sc.add("baby", baby_star(452, 470, 26, asleep=True), [{"kind": "breathe", "amp": 0.05, "period": 3.4}, bob], 452 / W, 470 / H, defs=STAR_GLOW)
    for i, (x, y, ph) in enumerate(((500, 340, 0.0), (556, 300, 0.34), (610, 350, 0.68))):
        sc.add(f"note{i}", music_note(x, y, 1.0 + 0.1 * i), [{"kind": "rise", "amp": 0.25, "period": 4.8, "phase": ph}, {"kind": "bob", "amp": 0.006, "period": 2.4, "phase": ph}])
    return sc


def p7():
    sc = Scene()
    wx, wy, ww, wh = 70, 90, 330, 250
    s, d = sky("#1b2556", "#46559a")
    sc.add("win_sky", f'<g clip-path="url(#wc)">{s.replace(f"""width="{W}" height="{H}" """, f"""x="{wx}" y="{wy}" width="{ww}" height="{wh}" """)}</g>',
           defs=d + f'<clipPath id="wc"><rect x="{wx}" y="{wy}" width="{ww}" height="{wh}"/></clipPath>')
    sc.add("win_stars", stars(21, 40, 330, 1.0, 3.0, xmin=wx - 120, xmax=wx + ww + 120).replace('cy="8', 'cy="100') + moon(300, 190, 24, glow=False).replace('r="24"', 'r="24"'),
           [{"kind": "drift", "dx": -0.22}])
    room = (f'<path fill-rule="evenodd" d="M0 0H{W}V{H}H0Z M{wx} {wy}H{wx+ww}V{wy+wh}H{wx}Z" fill="#3d3568"/>'
            + "".join(f'<rect x="{x}" y="0" width="6" height="{H}" fill="#463d78"/>' for x in range(0, 800, 100))
            + f'<rect x="0" y="470" width="{W}" height="{H-470}" fill="#4a3b55"/>')
    bobr = {"kind": "bob", "amp": 0.006, "period": 3.0}
    sc.add("room", room, [bobr])
    sc.add("win_frame", f'<rect x="{wx-8}" y="{wy-8}" width="{ww+16}" height="{wh+16}" rx="14" fill="none" stroke="#8a6b4a" stroke-width="14"/><path d="M{wx+ww/2} {wy} V{wy+wh}" stroke="#8a6b4a" stroke-width="8"/>', [bobr])
    sc.add("seat", '<rect x="360" y="400" width="400" height="90" rx="22" fill="#b9546a" stroke="#7d3447" stroke-width="4"/><rect x="360" y="330" width="60" height="110" rx="22" fill="#a54a5e" stroke="#7d3447" stroke-width="4"/>'
           '<rect x="370" y="486" width="380" height="14" rx="6" fill="#26356b"/>', [bobr])
    t = Tori(560, 478, 1.0)
    t.add(sc, "tori", closed=[{"kind": "ramp", "start": 0.12, "end": 0.85, "opFrom": 0, "opTo": 1}], ear_amp=3, extra=[bobr])
    sc.add("zzz", zzz(640, 250, 1.1), [{"kind": "ramp", "start": 0.6, "end": 0.9, "opFrom": 0, "opTo": 1}, {"kind": "rise", "amp": 0.12, "period": 4.5}])
    sc.add("lamp", '<circle cx="580" cy="30" r="170" fill="url(#hl)" opacity=".5"/><rect x="574" y="0" width="12" height="50" fill="#8a6b4a"/><circle cx="580" cy="60" r="18" fill="#fff3b0" stroke="#5a3e2b" stroke-width="3"/>',
           [{"kind": "twinkle", "amp": 0.2, "period": 3.0}, bobr], defs=TRAIN_DEFS)
    return sc


def p8():
    sc = Scene()
    bedroom(sc, closed="static", face=True)
    sc.add("zzz", zzz(250, 250, 1.2), [{"kind": "rise", "amp": 0.14, "period": 4.4}])
    return sc


SCENES = {1: p1, 2: p2, 3: p3, 4: p4, 5: p5, 6: p6, 7: p7, 8: p8}


AMBIENT = ("bob", "sway", "breathe", "twinkle", "rise")
GROUP = {"wheel": "train", "smoke": "train", "owl": "owl", "tori": "tori"}


def stagger(sc, step=0.45, cap=3.2):
    """층 묶음(캐릭터·기차·구름 …)이 한꺼번에가 아니라 차례로 깨어나게 시작 시간을 둔다.
    같은 묶음의 층은 같은 시간에 시작해야 몸이 따로 놀지 않는다."""
    import re
    order = {}
    for L in sc.layers:
        k = re.sub(r"\d+$", "", L["id"].split("_")[0])
        k = GROUP.get(k, k)
        if any(m["kind"] in AMBIENT and "delay" not in m for m in L["motion"]):
            order.setdefault(k, len(order))
        L["_k"] = k
    for L in sc.layers:
        d = round(min(cap, order.get(L["_k"], 0) * step), 2)
        for m in L["motion"]:
            if m["kind"] in AMBIENT and "delay" not in m and d > 0:
                m["delay"] = d
        del L["_k"]


def main():
    pages = {}
    only = [int(a) for a in sys.argv[1:]] or list(SCENES)
    if os.path.exists(SCENES_JSON):
        pages = json.load(open(SCENES_JSON, encoding="utf-8")).get(BOOK, {}).get("pages", {})
    for n in only:
        sc = SCENES[n]()
        stagger(sc)
        layers = render_scene(sc, BOOK, n, STORAGE)
        pages[str(n)] = {"base": f"books/{BOOK}/page-{n:02d}.png", "layers": layers}
        print(f"{n}쪽: 층 {len(layers)}개")
    data = {BOOK: {"pages": dict(sorted(pages.items(), key=lambda kv: int(kv[0])))}}
    json.dump(data, open(SCENES_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
