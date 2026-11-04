"""Build src/timings.json from an ElevenLabs word-timing file (words.json).

Usage: python -I scripts/timings.py path/to/words.json [promo|form|online]

Scene starts and the cues inside each scene (when a card appears) come from
when the voiceover says each word, so a new voice or take only needs this
script re-run. Times in the output are seconds of the voiceover itself; the
composition adds VO_OFFSET.
"""
import json
import sys
from pathlib import Path

words = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if isinstance(words, dict):
    words = words.get("words", words)
words = [w for w in words if w.get("type", "word") == "word" and not w["text"].startswith("[")]

pos = 0


def find(prefix: str) -> dict:
    """The next word (from the current position) that starts with `prefix`."""
    global pos
    for i in range(pos, len(words)):
        if words[i]["text"].lstrip("\"'“”‘’(").startswith(prefix):
            pos = i + 1
            return words[i]
    raise SystemExit(f"word not found after #{pos}: {prefix}")


# (scene, first word of its sentence, cue words inside the scene)
PROMO = [
    ("intro", "১৯৭৬", []),
    ("campus", "পঞ্চাশ", []),
    ("teachers", "যে", []),
    ("title", "প্রাক্তন", []),
    ("date", "২৬", ["সকাল", "স্কুল"]),
    ("programme", "জয়ন্তী", ["পতাকা", "শিক্ষক", "ব্যাচ", "সাংস্কৃতিক", "র"]),
    ("kit", "সাথে", ["নাস্তা", "দুপুরের", "বিরিয়ানি", "টি", "স্মারকগ্রন্থ", "উপহার"]),
    ("fees", "রেজিস্ট্রেশন", ["১২৫০", "১৫০০", "পরিবার"]),
    ("deadline", "রেজিস্ট্রেশন", []),
    ("cta", "এখনই", ["exsabujian", "পঞ্চাশ"]),
]

FORM = [
    ("intro", "সুবর্ণ", []),
    ("open", "প্রথমে", ["exsabujian", "তারপর"]),
    ("details", "প্রথম", ["মুখের", "ইংরেজি", "বাংলা"]),
    ("contact", "এরপর", ["ইমেইল", "পাসওয়ার্ড", "মোবাইল"]),
    ("profile", "এবার", ["এসএসসি", "বিভাগ", "লিঙ্গ", "জন্ম", "পেশা", "ঠিকানাও"]),
    ("proof", "স্কুলে", ["এসএসসি", "মার্কশিটের", "এটা"]),
    ("continue", "তারপর", ["Continue"]),
    ("step2", "দ্বিতীয়", ["সাথে", "টি", "মোট"]),
    ("pay", "পেমেন্ট", ["বাংলা", "যেকোনো"]),
    ("paydetails", "যে", ["শেষ", "পেমেন্টের", "রসিদের"]),
    ("submit", "সবশেষে", ["Join"]),
    ("ticket", "কমিটি", ["ইমেইলে", "ড্যাশবোর্ডেও", "অনুষ্ঠানের"]),
    ("end", "রেজিস্ট্রেশন", ["কোনো"]),
]

ONLINE = [
    ("intro", "অনলাইনে", []),
    ("offline", "অফলাইনে", ["কাগজের", "কমিটির", "হাতে", "তারপর"]),
    ("online", "অনলাইনে", ["ঘরে", "যেকোনো", "মাত্র"]),
    ("pay", "বাংলা", ["নিজের", "ভুলের"]),
    ("track", "ড্যাশবোর্ডে", ["যাচাই", "ইমেইলে", "গেটে"]),
    ("member", "সাথে", ["সদস্যপদ"]),
    ("privacy", "আপনার", ["মোবাইল", "দেখতে"]),
    ("women", "নারী", ["তাঁদের", "অন্যরা", "আসল"]),
    ("settings", "চাইলে", ["সেটিংস", "এসএসসি"]),
    ("cta", "তাই", ["আজই", "exsabujian"]),
]

which = sys.argv[2] if len(sys.argv) > 2 else "promo"
PLAN = {"form": FORM, "online": ONLINE}.get(which, PROMO)

out = {"scenes": {}, "cues": {}, "sentences": []}
for scene, first, cues in PLAN:
    w = find(first)
    # Cut halfway through the pause between the previous sentence and this one.
    prev_end = words[pos - 2]["end"] if pos >= 2 else 0.0
    start = 0.0 if scene == "intro" else round((prev_end + w["start"]) / 2, 2)
    out["scenes"][scene] = start
    out["cues"][scene] = [round(w["start"], 2)] + [round(find(c)["start"], 2) for c in cues]
    out["sentences"].append({"scene": scene, "from": round(w["start"], 2)})

# Each scene's speech ends where the next scene's first word begins.
for i, s in enumerate(out["sentences"]):
    nxt = out["sentences"][i + 1]["from"] if i + 1 < len(out["sentences"]) else words[-1]["end"]
    s["to"] = round(nxt, 2)
out["voEnd"] = round(words[-1]["end"], 2)

src = Path(__file__).resolve().parent.parent / "src"
dest = src / which / "timings.json" if which in ("form", "online") else src / "timings.json"
dest.parent.mkdir(exist_ok=True)
dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=2))
