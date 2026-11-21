"""동화 본문을 페이지별 낭독 MP3로 만든다.

본문 가져오기
- NARRATION_API + NARRATION_TOKEN 이 있으면 서비스 서버(/api/v1/narration/source)에서 가져온다
  → 관리자가 앱에서 고친 글·목소리·속도가 그대로 반영된다.
- 없으면 apps/api/src/seed/storybooks.json (처음 시드 본문)을 쓴다.

결과
- audio/files/<bookId>/page-NN.mp3  : 페이지마다 1개
- audio/manifest.json               : 책 -> 페이지 -> {file, duration, hash, textHash, cues[{start,end,text}]}
  cues 는 자막 맞추기용(문장 시작/끝 초). edge-tts의 문장 경계 값을 쓰고, 없으면 글자 수 비율로 나눈다.
  textHash 는 본문 글자의 FNV-1a 값 — 앱이 화면의 글과 비교해, 글이 고쳐졌는데 음성이 옛것이면 쓰지 않는다.

사용법
  python audio/gen.py          # 실제 음성 생성 (인터넷 필요, 바뀐 페이지만)
  python audio/gen.py --mock   # 음성 대신 신호음으로 구조만 시험 (인터넷 불필요)
  python audio/gen.py --check  # 만들지 않고 매니페스트가 본문과 맞는지만 검사 (맞지 않으면 종료코드 1)
  python audio/gen.py --seed   # API 가 있어도 시드 본문 사용
환경변수 GEN_REQUIRE_API=1 이면 API 정보가 없을 때 아무것도 하지 않고 끝낸다(주기 실행이 시드로 덮어쓰지 않게).
바뀐 페이지만 다시 만든다(본문 + 목소리 설정 해시).
"""
import asyncio, hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(ROOT)
SEED = os.path.join(REPO, "apps", "api", "src", "seed", "storybooks.json")
OUT = os.path.join(ROOT, "files")
MANIFEST = os.path.join(ROOT, "manifest.json")
VOICES = json.load(open(os.path.join(ROOT, "voices.json"), encoding="utf-8"))
VOICE_BY_ID = {v["id"]: v for v in VOICES["voices"]}
DEFAULT_VOICE = VOICE_BY_ID[VOICES["default"]]

GEN_VERSION = "2"          # 생성 방식이 바뀌면 올려서 전부 다시 만든다
LEAD_IN = 0.35             # 페이지가 넘어가고 목소리가 시작하기 전 짧은 쉼(초)
TAIL = 0.6                 # 끝 쉼(초)
MOCK = "--mock" in sys.argv
CHECK = "--check" in sys.argv
SEED_ONLY = "--seed" in sys.argv


def sh(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def voice_of(book):
    """책의 목소리 설정 → edge-tts 값 (알 수 없는 id 는 기본 목소리)"""
    base = VOICE_BY_ID.get(book.get("voice") or "", DEFAULT_VOICE)
    rate = max(-50, min(50, int(base["rate"]) + int(book.get("rate") or 0)))
    return {"engine": base["engine"], "pitch": int(base["pitch"]), "rate": rate}


def page_hash(text, voice):
    key = json.dumps([GEN_VERSION, voice["engine"], voice["pitch"], voice["rate"], text], ensure_ascii=False)
    return hashlib.sha1(key.encode()).hexdigest()[:12]


def text_hash(text):
    """앱(TypeScript hashSeed)과 같은 값: FNV-1a 32비트, 글자는 UTF-16 코드 단위로"""
    h = 2166136261
    b = text.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


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


async def synth(text, raw_mp3, voice):
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
            com = edge_tts.Communicate(text, voice["engine"], rate=f"{voice['rate']:+d}%",
                                       pitch=f"{voice['pitch']:+d}Hz", boundary="SentenceBoundary")
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


async def make_page(text, dst, voice):
    """한 페이지 MP3와 자막 큐를 만든다."""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "raw.mp3")
        bounds = await synth(text, raw, voice)
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
    return {"version": 2, "books": {}}


def fetch_source():
    """(책 목록, 출처 이름). 책: {id, voice, rate, pages[]}"""
    api, token = os.environ.get("NARRATION_API", "").strip(), os.environ.get("NARRATION_TOKEN", "").strip()
    if api and token and not SEED_ONLY:
        req = urllib.request.Request(api, headers={"x-narration-token": token, "User-Agent": "storybook-voice"})
        last = None
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = json.loads(r.read().decode("utf-8"))
                return data["books"], "서비스 서버"
            except Exception as e:  # 서버가 잠깐 안 될 때 대비
                last = e
                print("  본문 가져오기 다시 시도:", e)
                import time
                time.sleep(3 + attempt * 3)
        raise SystemExit(f"본문을 가져오지 못했어요: {last}")
    if os.environ.get("GEN_REQUIRE_API") == "1" and not SEED_ONLY:
        print("NARRATION_API/NARRATION_TOKEN 이 없어 건너뜀 (시드로 덮어쓰지 않음)")
        sys.exit(0)
    books = json.load(open(SEED, encoding="utf-8"))["books"]
    return [{"id": b["id"], "voice": "narrator", "rate": 0, "pages": b["pages"]} for b in books], "시드 파일"


def is_stale(entry, text, voice):
    return not entry or entry.get("hash") != page_hash(text, voice) or entry.get("textHash") != text_hash(text)


def stale_pages(books, man):
    out = []
    for b in books:
        voice = voice_of(b)
        have = man["books"].get(b["id"], {}).get("pages", {})
        for i, text in enumerate(b["pages"], 1):
            e = have.get(str(i))
            if is_stale(e, text, voice) or not os.path.exists(os.path.join(ROOT, e["file"])):
                out.append((b["id"], i))
    return out


async def main():
    books, origin = fetch_source()
    man = load_manifest()
    if CHECK:
        bad = stale_pages(books, man)
        extra = [bid for bid in man["books"] if bid not in {b["id"] for b in books}]
        for bid, i in bad:
            print("없음/오래됨:", bid, i)
        print(f"검사 끝({origin}), 새로 만들 쪽 {len(bad)}개, 지울 책 {len(extra)}권")
        sys.exit(1 if bad or extra else 0)

    print("본문 출처:", origin, f"({len(books)}권)")
    man["version"] = 2
    man.pop("voice", None)
    made = 0
    for b in books:
        bid, voice = b["id"], voice_of(b)
        book = man["books"].setdefault(bid, {"pages": {}})
        book["voice"] = voice["engine"]
        for i, text in enumerate(b["pages"], 1):
            rel = f"files/{bid}/page-{i:02d}.mp3"
            old = book["pages"].get(str(i))
            if not is_stale(old, text, voice) and os.path.exists(os.path.join(ROOT, rel)) and not MOCK:
                continue
            print(f"만드는 중: {bid[-2:]} 책 {i}쪽", flush=True)
            total, cues = await make_page(text, os.path.join(ROOT, rel), voice)
            book["pages"][str(i)] = {"file": rel, "duration": total, "hash": page_hash(text, voice), "textHash": text_hash(text), "cues": cues}
            made += 1
        for k in list(book["pages"]):  # 줄어든 쪽 정리
            if int(k) > len(b["pages"]):
                del book["pages"][k]
    keep = {b["id"] for b in books}
    for bid in list(man["books"]):
        if bid not in keep:
            del man["books"][bid]
    # 쓰이지 않는 mp3 파일 정리 (책이 내려갔거나 쪽이 줄었을 때)
    used = {e["file"] for bk in man["books"].values() for e in bk["pages"].values()}
    for dp, _dn, fns in os.walk(OUT):
        for fn in fns:
            rel = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, "/")
            if fn.endswith(".mp3") and rel not in used:
                os.remove(os.path.join(dp, fn))
                print("지움:", rel)
    json.dump(man, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("완료: 새로 만든", made, "쪽, 전체", sum(len(b["pages"]) for b in man["books"].values()), "쪽")


if __name__ == "__main__":
    asyncio.run(main())
