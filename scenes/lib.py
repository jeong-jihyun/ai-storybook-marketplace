"""층 장면 그림 도구 — SVG 조각을 층(투명 PNG)으로 만들고 움직임 정보와 함께 scenes.json 으로 내보낸다.
좌표계: 가로 800 x 세로 600. 층마다 PNG 한 장(1200x900), 움직임은 앱의 layerState 가 계산한다."""
import json, math, os, random, subprocess

W, H = 800, 600
OUT_W, OUT_H = 1200, 900

INK = "#5a3e2b"      # 윤곽선
CREAM = "#f6ead9"
PINK = "#f7b9c7"
SCARF = "#f2c230"
MOON = "#f6c944"


class Scene:
    def __init__(self):
        self.layers = []

    def add(self, lid, svg, motion=None, px=0.5, py=0.5, defs=""):
        self.layers.append({"id": lid, "svg": svg, "defs": defs, "motion": motion or [], "px": round(px, 4), "py": round(py, 4)})


def wrap(svg, defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{OUT_W}" height="{OUT_H}"><defs>{defs}</defs>{svg}</svg>'


def render_scene(scene, book_id, page, storage_root):
    """층마다 PNG 를 만들고 scenes.json 한 쪽 분량(dict)을 돌려준다"""
    d = os.path.join(storage_root, "books", book_id, "scene")
    os.makedirs(d, exist_ok=True)
    out = []
    for L in scene.layers:
        name = f"p{page}-{L['id']}.png"
        svg = wrap(L["svg"], L["defs"])
        p = subprocess.run(["rsvg-convert", "-w", str(OUT_W), "-h", str(OUT_H), "-f", "png", "-o", os.path.join(d, name)], input=svg.encode("utf-8"), capture_output=True)
        if p.returncode:
            raise SystemExit(f"rsvg 실패 {name}: {p.stderr.decode()[:300]}")
        out.append({"id": L["id"], "file": f"books/{book_id}/scene/{name}", "px": L["px"], "py": L["py"], "motion": L["motion"]})
    return out


# ───── 공용 그리기 조각 ─────
def lin(id_, top, bot, x1="0", y1="0", x2="0", y2="1"):
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>'


def rad(id_, color, inner=0.9, outer=0.0):
    return f'<radialGradient id="{id_}"><stop offset="0" stop-color="{color}" stop-opacity="{inner}"/><stop offset="1" stop-color="{color}" stop-opacity="{outer}"/></radialGradient>'


def sky(top="#1b2556", bot="#46559a"):
    return (f'<rect width="{W}" height="{H}" fill="url(#sk)"/>', lin("sk", top, bot))


def stars(seed, n, ymax=360, rmin=0.8, rmax=2.4, color="#fff8e0", xmin=0, xmax=W):
    r = random.Random(seed)
    s = ""
    for _ in range(n):
        s += f'<circle cx="{r.uniform(xmin,xmax):.1f}" cy="{r.uniform(8,ymax):.1f}" r="{r.uniform(rmin,rmax):.1f}" fill="{color}"/>'
    return s


def star_path(cx, cy, R, r=None, rot=-90):
    r = r or R * 0.5
    pts = []
    for i in range(10):
        a = math.radians(rot + i * 36)
        rr = R if i % 2 == 0 else r
        pts.append(f"{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}")
    return "M" + " L".join(pts) + " Z"


def moon(cx, cy, r, face=False, glow=True):
    s = ""
    if glow:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r*2.1}" fill="url(#mg)"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{MOON}"/>'
    s += f'<circle cx="{cx-r*0.35}" cy="{cy-r*0.2}" r="{r*0.18}" fill="#e8b835" opacity=".55"/><circle cx="{cx+r*0.3}" cy="{cy+r*0.35}" r="{r*0.12}" fill="#e8b835" opacity=".5"/>'
    if face:
        s += f'<path d="M{cx-r*0.42} {cy-r*0.05} q{r*0.15} {r*0.14} {r*0.3} 0 M{cx+r*0.12} {cy-r*0.05} q{r*0.15} {r*0.14} {r*0.3} 0" stroke="{INK}" stroke-width="{max(2,r*0.06)}" fill="none" stroke-linecap="round"/>'
        s += f'<path d="M{cx-r*0.3} {cy+r*0.3} q{r*0.3} {r*0.3} {r*0.6} 0" stroke="{INK}" stroke-width="{max(2,r*0.06)}" fill="none" stroke-linecap="round"/>'
        s += f'<circle cx="{cx-r*0.52}" cy="{cy+r*0.18}" r="{r*0.12}" fill="#f09a7a" opacity=".6"/><circle cx="{cx+r*0.52}" cy="{cy+r*0.18}" r="{r*0.12}" fill="#f09a7a" opacity=".6"/>'
    return s


MOON_DEFS = rad("mg", "#ffe9a0", 0.55, 0)


def cloud(cx, cy, s=1.0, fill="#b9c6ee", op=0.9):
    c = [(-46, 8, 30), (-14, -6, 38), (24, -2, 34), (52, 10, 26), (0, 14, 36)]
    out = "".join(f'<circle cx="{cx+x*s:.1f}" cy="{cy+y*s:.1f}" r="{r*s:.1f}"/>' for x, y, r in c)
    return f'<g fill="{fill}" opacity="{op}">{out}<rect x="{cx-70*s:.1f}" y="{cy+10*s:.1f}" width="{140*s:.1f}" height="{30*s:.1f}" rx="{15*s:.1f}"/></g>'


def hills(color, y, amp=30, seed=1, shade=None):
    r = random.Random(seed)
    pts = [f"M0 {H}", f"L0 {y}"]
    for i in range(1, 9):
        pts.append(f"Q{i*100-50} {y - amp*r.uniform(0.4,1):.0f} {i*100} {y + r.uniform(-8,8):.0f}")
    pts.append(f"L{W} {H} Z")
    return f'<path d="{" ".join(pts)}" fill="{color}"/>'


def music_note(x, y, s=1.0, color="#ffe9a0"):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="{color}" stroke="{INK}" stroke-width="2" stroke-linejoin="round">'
            f'<ellipse cx="0" cy="0" rx="10" ry="7.5" transform="rotate(-20)"/><path d="M8 -3 L8 -42 Q22 -36 24 -22" fill="none" stroke-linecap="round" stroke-width="4"/></g>')


def qmark(x, y, s=1.0, color="#ffe9a0"):
    return (f'<g transform="translate({x},{y}) scale({s})" stroke="{color}" stroke-width="7" fill="none" stroke-linecap="round">'
            f'<path d="M-14 -16 C-14 -38 16 -38 16 -16 C16 -2 0 -2 0 12"/></g><circle cx="{x}" cy="{y+27*s}" r="{5*s}" fill="{color}"/>')


def zzz(x, y, s=1.0, color="#cfd8ff"):
    z = lambda ox, oy, k: f'<path transform="translate({x+ox*s},{y+oy*s}) scale({k*s})" d="M-10 -10 H10 L-10 10 H10" stroke="{color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    return z(0, 0, 1.0) + z(22, -26, 0.75) + z(40, -46, 0.55)


# ───── 등장인물 ─────
class Tori:
    """토끼 토리. 원점=몸 아래 가운데. 층: ear_l, ear_r, body, head, eyes_closed"""

    def __init__(self, x, y, s=1.0, flip=False):
        self.x, self.y, self.s, self.f = x, y, s, -1 if flip else 1

    def _g(self, inner):
        return f'<g transform="translate({self.x},{self.y}) scale({self.s*self.f},{self.s})" stroke-linejoin="round" stroke-linecap="round">{inner}</g>'

    def world(self, lx, ly):
        return (self.x + lx * self.s * self.f) / W, (self.y + ly * self.s) / H

    def ear(self, side):
        cx = -20 * side
        inner = (f'<g transform="rotate({-8*side} {cx} -146)"><ellipse cx="{cx}" cy="-180" rx="14" ry="40" fill="{CREAM}" stroke="{INK}" stroke-width="3"/>'
                 f'<ellipse cx="{cx}" cy="-178" rx="7" ry="27" fill="{PINK}"/></g>')
        return self._g(inner)

    def body(self, scarf=True):
        s = (f'<ellipse cx="0" cy="-45" rx="44" ry="50" fill="{CREAM}" stroke="{INK}" stroke-width="3"/>'
             f'<ellipse cx="0" cy="-36" rx="27" ry="33" fill="#fff8ee"/>'
             f'<circle cx="-30" cy="-12" r="11" fill="{CREAM}" stroke="{INK}" stroke-width="3"/><circle cx="30" cy="-12" r="11" fill="{CREAM}" stroke="{INK}" stroke-width="3"/>')
        if scarf:
            s += f'<path d="M-38 -88 Q0 -68 38 -88 L35 -73 Q0 -54 -35 -73 Z" fill="{SCARF}" stroke="{INK}" stroke-width="3"/>'
        return self._g(s)

    def head(self):
        return self._g(
            f'<circle cx="0" cy="-118" r="44" fill="{CREAM}" stroke="{INK}" stroke-width="3"/>'
            f'<circle cx="-28" cy="-107" r="8" fill="{PINK}" opacity=".75"/><circle cx="28" cy="-107" r="8" fill="{PINK}" opacity=".75"/>'
            f'<circle cx="-16" cy="-122" r="5.2" fill="#3b2a1f"/><circle cx="16" cy="-122" r="5.2" fill="#3b2a1f"/>'
            f'<circle cx="-14.6" cy="-124" r="1.7" fill="#fff"/><circle cx="17.4" cy="-124" r="1.7" fill="#fff"/>'
            f'<ellipse cx="0" cy="-112" rx="4.5" ry="3.2" fill="#e58ea0"/>'
            f'<path d="M-8 -104 Q0 -96 8 -104" stroke="{INK}" stroke-width="2.6" fill="none"/>')

    def eyes_closed(self):
        return self._g(
            f'<circle cx="-16" cy="-122" r="8.5" fill="{CREAM}"/><circle cx="16" cy="-122" r="8.5" fill="{CREAM}"/>'
            f'<path d="M-23 -122 Q-16 -114 -9 -122" stroke="#3b2a1f" stroke-width="3" fill="none"/><path d="M9 -122 Q16 -114 23 -122" stroke="#3b2a1f" stroke-width="3" fill="none"/>')

    def add(self, sc, prefix="tori", body=True, closed=None, ears=True, ear_amp=5, blink=True, sway=None, extra=None):
        """장면에 토리를 층으로 넣는다. closed: None=깜빡임, 'static'=계속 감음, 모션 목록=그대로 사용"""
        extra = extra or []
        if ears:
            for side, nm, ph in ((1, "ear_l", 0.0), (-1, "ear_r", 0.35)):
                px, py = self.world(-20 * side, -146)
                sc.add(f"{prefix}_{nm}", self.ear(side), [{"kind": "sway", "amp": ear_amp, "period": 1.6 + ph, "burst": 2.4, "gap": 2.2, "phase": ph}] + extra, px, py)
        if body:
            sc.add(f"{prefix}_body", self.body(), [dict(m) for m in extra])
        sc.add(f"{prefix}_head", self.head(), [dict(m) for m in extra])
        if closed == "static":
            sc.add(f"{prefix}_eyes_closed", self.eyes_closed(), [dict(m) for m in extra])
        elif isinstance(closed, list):
            sc.add(f"{prefix}_eyes_closed", self.eyes_closed(), closed + [dict(m) for m in extra])
        elif blink:
            sc.add(f"{prefix}_eyes_closed", self.eyes_closed(), [{"kind": "blink", "period": 3.6, "dur": 0.18, "phase": 0.12}] + [dict(m) for m in extra])


class Owl:
    """차장 부엉이. 층: body, wing, hat, eyes_closed"""

    def __init__(self, x, y, s=1.0):
        self.x, self.y, self.s = x, y, s

    def _g(self, inner):
        return f'<g transform="translate({self.x},{self.y}) scale({self.s})" stroke-linejoin="round" stroke-linecap="round">{inner}</g>'

    def world(self, lx, ly):
        return (self.x + lx * self.s) / W, (self.y + ly * self.s) / H

    def body(self):
        return self._g(
            '<path d="M-20 -3 l-8 8 h20 z M20 -3 l8 8 h-20 z" fill="#f09a3e" stroke="#5a3e2b" stroke-width="2.5"/>'
            '<ellipse cx="0" cy="-58" rx="46" ry="58" fill="#8d5e3f" stroke="#5a3e2b" stroke-width="3"/>'
            '<ellipse cx="0" cy="-48" rx="30" ry="42" fill="#ecd0a8"/>'
            + "".join(f'<path d="M{x-8} {y} q8 8 16 0" stroke="#c9a273" stroke-width="2.5" fill="none"/>' for x, y in ((-14, -70), (6, -70), (-4, -52), (-22, -50), (14, -50), (-12, -34), (8, -34)))
            + '<path d="M-44 -62 q-16 22 -2 46 q10 -14 8 -40 z" fill="#7a4f33" stroke="#5a3e2b" stroke-width="3"/>'
            '<circle cx="0" cy="-112" r="40" fill="#8d5e3f" stroke="#5a3e2b" stroke-width="3"/>'
            '<path d="M-34 -138 l-6 -18 l20 10 z M34 -138 l6 -18 l-20 10 z" fill="#7a4f33" stroke="#5a3e2b" stroke-width="3"/>'
            '<circle cx="-17" cy="-114" r="16" fill="#fff8e8" stroke="#5a3e2b" stroke-width="2.5"/><circle cx="17" cy="-114" r="16" fill="#fff8e8" stroke="#5a3e2b" stroke-width="2.5"/>'
            '<circle cx="-15" cy="-113" r="8" fill="#2a1c10"/><circle cx="19" cy="-113" r="8" fill="#2a1c10"/>'
            '<circle cx="-12.5" cy="-116" r="2.6" fill="#fff"/><circle cx="21.5" cy="-116" r="2.6" fill="#fff"/>'
            '<path d="M-6 -102 L0 -90 L6 -102 Z" fill="#f09a3e" stroke="#5a3e2b" stroke-width="2.5"/>')

    def wing(self):
        return self._g('<path d="M36 -92 q34 6 30 44 q-4 14 -14 4 q4 -22 -22 -32 z" fill="#7a4f33" stroke="#5a3e2b" stroke-width="3"/>')

    def hat(self):
        return self._g(
            '<path d="M-34 -138 Q-30 -178 0 -180 Q30 -178 34 -138 Z" fill="#26356b" stroke="#5a3e2b" stroke-width="3"/>'
            '<rect x="-34" y="-148" width="68" height="10" fill="#f2c230" stroke="#5a3e2b" stroke-width="2.5"/>'
            '<path d="M-46 -137 Q0 -122 46 -137 Q0 -150 -46 -137 Z" fill="#1c2756" stroke="#5a3e2b" stroke-width="3"/>'
            '<circle cx="0" cy="-163" r="6" fill="#f2c230" stroke="#5a3e2b" stroke-width="2"/>')

    def eyes_closed(self):
        return self._g('<circle cx="-17" cy="-114" r="17" fill="#8d5e3f"/><circle cx="17" cy="-114" r="17" fill="#8d5e3f"/>'
                       '<path d="M-28 -114 Q-17 -104 -6 -114" stroke="#2a1c10" stroke-width="3.5" fill="none"/><path d="M6 -114 Q17 -104 28 -114" stroke="#2a1c10" stroke-width="3.5" fill="none"/>')


def baby_star(cx, cy, R, asleep=False, op=1.0):
    s = f'<circle cx="{cx}" cy="{cy}" r="{R*1.9}" fill="url(#sg)" opacity="{op}"/>' if True else ""
    s += f'<path d="{star_path(cx,cy,R)}" fill="#ffe27a" stroke="#d9a925" stroke-width="3" stroke-linejoin="round"/>'
    e = R * 0.22
    if asleep:
        s += (f'<path d="M{cx-e*1.8} {cy-R*0.05} q{e*0.8} {e*0.9} {e*1.6} 0 M{cx+e*0.2} {cy-R*0.05} q{e*0.8} {e*0.9} {e*1.6} 0" stroke="{INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>')
    else:
        s += f'<circle cx="{cx-e*1.1}" cy="{cy-R*0.05}" r="{e*0.6}" fill="#3b2a1f"/><circle cx="{cx+e*1.1}" cy="{cy-R*0.05}" r="{e*0.6}" fill="#3b2a1f"/>'
    s += f'<path d="M{cx-e*0.8} {cy+R*0.22} q{e*0.8} {e*0.8} {e*1.6} 0" stroke="{INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    s += f'<circle cx="{cx-e*2.2}" cy="{cy+R*0.15}" r="{e*0.5}" fill="#f4a08a" opacity=".6"/><circle cx="{cx+e*2.2}" cy="{cy+R*0.15}" r="{e*0.5}" fill="#f4a08a" opacity=".6"/>'
    return s


STAR_GLOW = rad("sg", "#ffe9a0", 0.5, 0)


def train(x, y, s=1.0, lights=True):
    """달빛 기차(오른쪽을 봄). 원점=맨 왼쪽 바닥. 돌려주는 값: 몸통 svg, 바퀴 [(svg, 중심(월드 비율))], 굴뚝 위치(월드)"""
    def T(inner):
        return f'<g transform="translate({x},{y}) scale({s})" stroke-linejoin="round" stroke-linecap="round">{inner}</g>'
    body = ""
    for i, x0 in enumerate((10, 128)):
        body += (f'<rect x="{x0}" y="-108" width="108" height="66" rx="10" fill="#cfd8ee" stroke="{INK}" stroke-width="3"/>'
                 f'<rect x="{x0-4}" y="-116" width="116" height="12" rx="6" fill="#6fb3e0" stroke="{INK}" stroke-width="3"/>')
        for k in range(3):
            body += f'<rect x="{x0+10+k*31}" y="-96" width="22" height="26" rx="6" fill="#ffe08a" stroke="{INK}" stroke-width="2.5"/>'
    body += f'<rect x="236" y="-46" width="14" height="6" fill="{INK}"/><rect x="118" y="-46" width="12" height="6" fill="{INK}"/>'
    body += (f'<rect x="250" y="-124" width="64" height="84" rx="10" fill="#bcc9e8" stroke="{INK}" stroke-width="3"/>'
             f'<rect x="246" y="-134" width="72" height="14" rx="7" fill="#6fb3e0" stroke="{INK}" stroke-width="3"/>'
             f'<rect x="262" y="-112" width="38" height="32" rx="7" fill="#ffe08a" stroke="{INK}" stroke-width="2.5"/>'
             f'<rect x="312" y="-100" width="130" height="62" rx="30" fill="#d9e2f5" stroke="{INK}" stroke-width="3"/>'
             f'<rect x="392" y="-142" width="26" height="46" rx="5" fill="#6fb3e0" stroke="{INK}" stroke-width="3"/>'
             f'<rect x="386" y="-150" width="38" height="12" rx="6" fill="#26356b" stroke="{INK}" stroke-width="3"/>'
             f'<path d="M440 -44 l22 12 h-22 z" fill="#f2c230" stroke="{INK}" stroke-width="3"/>'
             f'<circle cx="440" cy="-70" r="9" fill="#fff3b0" stroke="{INK}" stroke-width="2.5"/>'
             f'<circle cx="320" cy="-70" r="6" fill="#f2c230" stroke="{INK}" stroke-width="2"/><circle cx="350" cy="-70" r="6" fill="#f2c230" stroke="{INK}" stroke-width="2"/>'
             f'<rect x="0" y="-42" width="450" height="8" rx="4" fill="#26356b" stroke="{INK}" stroke-width="3"/>')
    if lights:
        body += f'<circle cx="445" cy="-70" r="46" fill="url(#hl)" opacity=".7"/>'
    wheels = []
    for wx in (60, 190, 290, 390):
        wsvg = (f'<g transform="translate({x+wx*s},{y-22*s}) scale({s})"><circle r="21" fill="#2d3a6e" stroke="{INK}" stroke-width="3"/><circle r="8" fill="#f2c230" stroke="{INK}" stroke-width="2"/>'
                '<path d="M0 -19 V19 M-19 0 H19" stroke="#8fa3d8" stroke-width="3.5"/></g>')
        wheels.append((wsvg, ((x + wx * s) / W, (y - 22 * s) / H)))
    return T(body), wheels, (x + 405 * s, y - 150 * s)


TRAIN_DEFS = rad("hl", "#fff3b0", 0.8, 0)


def smoke(cx, cy, r=14, op=0.85):
    return f'<g fill="#e9eefc" opacity="{op}"><circle cx="{cx}" cy="{cy}" r="{r}"/><circle cx="{cx+r*0.9}" cy="{cy-r*0.3}" r="{r*0.75}"/><circle cx="{cx-r*0.8}" cy="{cy+r*0.2}" r="{r*0.7}"/></g>'


def house(x, y, s=1.0, wall="#3e4c8c", roof="#26356b"):
    """작은 집. 돌려주는 값: (집 svg, 불빛 svg)"""
    g = lambda inner: f'<g transform="translate({x},{y}) scale({s})" stroke-linejoin="round" stroke-linecap="round">{inner}</g>'
    body = (f'<rect x="-44" y="-70" width="88" height="70" rx="6" fill="{wall}" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M-56 -66 L0 -118 L56 -66 Z" fill="{roof}" stroke="{INK}" stroke-width="3"/>'
            f'<rect x="-12" y="-34" width="24" height="34" rx="12" fill="#2b2f5e" stroke="{INK}" stroke-width="2.5"/>'
            f'<rect x="-36" y="-56" width="20" height="20" rx="4" fill="#2b2f5e" stroke="{INK}" stroke-width="2.5"/><rect x="16" y="-56" width="20" height="20" rx="4" fill="#2b2f5e" stroke="{INK}" stroke-width="2.5"/>')
    light = (f'<rect x="-36" y="-56" width="20" height="20" rx="4" fill="#ffe08a"/><rect x="16" y="-56" width="20" height="20" rx="4" fill="#ffe08a"/>'
             f'<circle cx="-26" cy="-46" r="30" fill="url(#wl)" opacity=".8"/><circle cx="26" cy="-46" r="30" fill="url(#wl)" opacity=".8"/>')
    return g(body), g(light)


HOUSE_DEFS = rad("wl", "#ffe9a0", 0.8, 0)
