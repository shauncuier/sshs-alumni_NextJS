"""Build src/timings.json from an ElevenLabs word-timing file (words.json).

Usage: python -I scripts/timings.py path/to/words.json

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
        if words[i]["text"].startswith(prefix):
            pos = i + 1
            return words[i]
    raise SystemExit(f"word not found after #{pos}: {prefix}")


# (scene, first word of its sentence, cue words inside the scene)
PLAN = [
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
out["fees_family"] = out["cues"]["fees"][3]
out["voEnd"] = round(words[-1]["end"], 2)

dest = Path(__file__).resolve().parent.parent / "src" / "timings.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=2))
