"""Compile the reviewed, pipe-separated vocabulary files. No third-party packages."""
from pathlib import Path
import hashlib
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
VERSION = "20260918-3"
TITLES = ["Relationships", "Places and Buildings", "Education and Employment",
          "Food and Drink", "Consumerism", "Leisure Time", "Fame and the Media", "Natural World"]
SKILLS = {"reading": "Reading", "listening": "Listening", "speaking": "Speaking", "writing": "Writing"}
DESCRIPTIONS = {
    "reading": "Từ và cụm từ trong các bài đọc của Unit.",
    "listening": "Từ và cụm từ theo các tình huống trong transcript.",
    "speaking": "Từ vựng, collocation và khung câu để phát triển bài nói.",
    "writing": "Ngôn ngữ theo dạng bài, collocation và cấu trúc viết áp dụng.",
}
reference = json.loads((ROOT / "content/pronunciation-reference.json").read_text())


def norm(text):
    return unicodedata.normalize("NFC", text).strip()


def dump(path, value, prefix=""):
    path.write_text(prefix + json.dumps(value, ensure_ascii=False, indent=2) + (";" if prefix else "") + "\n")


registry, counts, all_terms, duplicates = [], [], set(), []
for number, title in enumerate(TITLES, 1):
    sections = {key: {"id": key, "label": label, "description": DESCRIPTIONS[key], "groups": []}
                for key, label in SKILLS.items()}
    seen = {key: set() for key in SKILLS}
    for line_number, line in enumerate((ROOT / f"content/unit{number}.txt").read_text().splitlines(), 1):
        if not line.strip():
            continue
        parts = [norm(s) for s in line.split("|")]
        if line.startswith("@"):
            assert len(parts) == 3, (number, line_number, parts)
            skill, group_title, source = parts
            skill = skill[1:]
            assert skill in SKILLS
            origin = "extension" if source.startswith("Bổ sung") else {"reading": "passage", "listening": "transcript"}.get(skill, "lesson")
            group = {"id": f"{skill}-{len(sections[skill]['groups']) + 1}", "title": group_title,
                     "source": source, "origin": origin, "words": []}
            sections[skill]["groups"].append(group)
            continue
        assert 2 <= len(parts) <= 4, (number, line_number, parts)
        term, meaning = parts[:2]
        key = term.casefold()
        assert term and meaning
        if key in seen[skill]:
            duplicates.append([number, skill, term])
            continue
        seen[skill].add(key)
        kind = parts[2] if len(parts) > 2 and parts[2] else ("structure" if "..." in term or "+ V-ing" in term else "phrase" if " " in term else "word")
        assert kind in ["word", "phrase", "collocation", "structure"]
        word = {"id": f"u{number}-{skill}-{hashlib.sha256(key.encode()).hexdigest()[:12]}",
                "word": term, "meaning": meaning, "type": kind}
        old = reference.get(key, {})
        if old.get("ipa"):
            word["ipa"] = old["ipa"]
        if len(parts) > 3 and parts[3]:
            word["example"] = parts[3]
        elif old.get("example"):
            word["example"] = old["example"]
            if old.get("translation"):
                word["exampleTranslation"] = old["translation"]
        group["words"].append(word)
        all_terms.add(key)
    unit = {"id": f"unit-{number}", "number": number, "title": title, "sections": list(sections.values())}
    per_skill = {key: sum(len(g["words"]) for g in s["groups"]) for key, s in sections.items()}
    unit["count"] = sum(per_skill.values())
    dump(ROOT / f"data/unit{number}.js", unit, "export default ")
    registry.append({"id": unit["id"], "number": number, "title": title, "count": unit["count"],
                     "module": f"./data/unit{number}.js?v={VERSION}"})
    counts.append({"unit": number, "total": unit["count"], **per_skill})
dump(ROOT / "data/units.js", registry, "export const unitsRegistry = ")
stats = {"version": VERSION, "units": 8, "skills": 32, "total": sum(u["total"] for u in counts),
         "uniqueTerms": len(all_terms), "perUnit": counts}
dump(ROOT / "data/stats.json", stats)
print(json.dumps({**stats, "duplicatesRemoved": duplicates}, ensure_ascii=False, indent=2))
