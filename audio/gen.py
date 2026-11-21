"""동화 본문(apps/api/src/seed/storybooks.json)을 페이지별 낭독 MP3로 만든다.

결과
- audio/files/<bookId>/page-NN.mp3  : 페이지마다 1개
- audio/manifest.json               : 책 -> 페이지 -> {file, duration, cues[{start,end,text}]}
  cues 는 자막 맞추기용(문장 시작/끝 초). edge-tts의 문장 경계 값을 쓰고, 없으면 글자 수 비율로 나눈다.

사용법
  python audio/gen.py          # 실제 음성 생성 (인터넷 필요, 바뀐 페이지만)
  python audio/gen.py --mock   # 음성 대신 신호음으로 구조만 시험 (인터넷 불필요)
  python audio/gen.py --check  # 만들지 않고 매니페스트가 시드와 맞는지만 검사
바뀐 페이지만 다시 만든다(본문 + 목소리 설정 해시).
"""
import asyncio, hashlib, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
SEED = os.path.join(REPO, "apps", "api", "src", "seed", "storybooks.json")
OUT = os.path.join(ROOT, "files")
MANIFEST = os.path.join(ROOT, "manifest.json")
VOICES = json.load(open(os.path.join(ROOT, "voices.json"), encoding="utf-8"))
VOICE = next(v for v in VOICES["voices"] if v["id"] == VOICES["default"])

GEN_VERSION = "1"          # 생성 방식이 바뀌면 올려서 전부 다시 만든다
LEAD_IN = 0.35             # 페이지가 넘어가고 목소리가 시작하기 전 짧은 쉼(초)
TAIL = 0.6                 # 끝 쉼(초)
MOCK = "--mock" in sys.argv
CHECK = "--check" in sys.argv


def sh(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def page_hash(text):
    key = json.dumps([GEN_VERSION, VOICE["engine"], VOICE["pitch"], VOICE["rate"], text], ensure_ascii=False)
    return hashlib.sha1(key.encode()).hexdigest()[:12]


def split_sentences(text):
    """문장 경계 값이 없을 때 쓰는 대체 분리 (. ! ? … 뒤)."""
    parts = re.findall(r'[^.!?…]+(?:[.!?…]+["”’\')]*)?\s*', text)
    return [p.strip() for p in parts if p.strip()]


def proportional_cues(text, total, lead):
    sents = split_sentences(text) or [text]
    weights = [max(1, len(re.sub(r"\s", "", s))) for s in sents]
    span = max(0.1, total - lead - TAIL)
    t, cues = lead, []
    for s, w in zip(sents, weights):
        d = span * w / sum(weights)
        cues.append({"start": round(t, 2), "end": round(t + d, 2), "text": s})
        t += d
    return cues


async def synth(text, raw_mp3):
    """edge-tts로 말하고 (문장 경계 목록)을 돌려준다. 시간 단위는 초."""
    if MOCK:
        secs = max(1.5, len(text) * 0.09)
        sh("ffmpeg", "-y", "-f", "lavfi", "-i", f"sine=frequency=330:duration={secs:.2f}",
           "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k", raw_mp3)
        return []
    import edge_tts
    last = None
    for attempt in range(4):
        try:
            com = edge_tts.Communicate(text, VOICE["engine"], rate=f"{VOICE['rate']:+d}%",
                                       pitch=f"{VOICE['pitch']:+d}Hz", boundary="SentenceBoundary")
            bounds = []
            with open(raw_mp3, "wb") as f:
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
                    elif ch["type"] == "SentenceBoundary":
                        bounds.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
            return bounds
        except Exception as e:  # 일시적인 네트워크 오류 대비
            last = e
            print("  다시 시도:", e)
            await asyncio.sleep(2 + attempt * 2)
    raise last


async def make_page(text, dst):
    """한 페이지 MP3와 자막 큐를 만든다."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "raw.mp3")
        bounds = await synth(text, raw)
        # 앞뒤에 짧은 쉼을 붙이고 소리 크기를 고르게 맞춘 뒤 MP3로 저장
        sh("ffmpeg", "-y", "-i", raw,
           "-af", f"adelay={int(LEAD_IN * 1000)}:all=1,apad=pad_dur={TAIL},loudnorm=I=-18:TP=-2:LRA=11",
           "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k", dst)
    total = dur(dst)
    if bounds:
        cues = [{"start": round(s + LEAD_IN, 2), "end": round(min(total, e + LEAD_IN), 2), "text": t.strip()}
                for s, e, t in bounds if t.strip()]
        # 경계 값이 본문과 어긋나면(글자 수가 많이 다르면) 비율 방식으로 되돌린다
        if abs(len(re.sub(r"\s", "", "".join(c["text"] for c in cues))) - len(re.sub(r"\s", "", text))) > 3:
            cues = proportional_cues(text, total, LEAD_IN)
    else:
        cues = proportional_cues(text, total, LEAD_IN)
    return round(total, 2), cues


def load_manifest():
    if os.path.exists(MANIFEST):
        return json.load(open(MANIFEST, encoding="utf-8"))
    return {"version": 1, "voice": VOICE["engine"], "books": {}}


def expected():
    books = json.load(open(SEED, encoding="utf-8"))["books"]
    return {b["id"]: b["pages"] for b in books}


async def main():
    want = expected()
    man = load_manifest()
    if CHECK:
        bad = 0
        for bid, pages in want.items():
            have = man["books"].get(bid, {}).get("pages", {})
            for i, text in enumerate(pages, 1):
                e = have.get(str(i))
                if not e or e["hash"] != page_hash(text) or not os.path.exists(os.path.join(ROOT, e["file"])):
                    print("없음/오래됨:", bid, i)
                    bad += 1
        print("검사 끝, 문제", bad, "개")
        sys.exit(1 if bad else 0)

    man["voice"] = VOICE["engine"]
    made = 0
    for bid, pages in want.items():
        book = man["books"].setdefault(bid, {"pages": {}})
        for i, text in enumerate(pages, 1):
            h = page_hash(text)
            rel = f"files/{bid}/page-{i:02d}.mp3"
            old = book["pages"].get(str(i))
            if old and old["hash"] == h and os.path.exists(os.path.join(ROOT, rel)) and not MOCK:
                continue
            print(f"만드는 중: {bid[-2:]} 책 {i}쪽", flush=True)
            total, cues = await make_page(text, os.path.join(ROOT, rel))
            book["pages"][str(i)] = {"file": rel, "duration": total, "hash": h, "cues": cues}
            made += 1
        # 시드에서 사라진 페이지 정리
        for k in list(book["pages"]):
            if int(k) > len(pages):
                del book["pages"][k]
    for bid in list(man["books"]):
        if bid not in want:
            del man["books"][bid]
    json.dump(man, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("완료: 새로 만든", made, "쪽, 전체", sum(len(b["pages"]) for b in man["books"].values()), "쪽")


if __name__ == "__main__":
    asyncio.run(main())
