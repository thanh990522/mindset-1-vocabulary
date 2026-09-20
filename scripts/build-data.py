"""Compile the reviewed, pipe-separated vocabulary files. No third-party packages."""
from pathlib import Path
import hashlib
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
VERSION = "20260920-1"
TITLES = ["Relationships", "Places and Buildings", "Education and Employment",
          "Food and Drink", "Consumerism", "Leisure Time", "Fame and the Media", "Natural World"]
SKILLS = {"reading": "Reading", "listening": "Listening", "speaking": "Speaking", "writing": "Writing"}
DESCRIPTIONS = {
    "reading": "Từ và cụm từ trong các bài đọc của Unit.",
    "listening": "Từ và cụm từ theo các tình huống trong transcript.",
    "speaking": "Từ vựng, collocation và khung câu để phát triển bài nói.",
    "writing": "Ngôn ngữ theo dạng bài, collocation và cấu trúc viết áp dụng.",
}
pronunciations = json.loads((ROOT / "content/ipa-us.json").read_text())
pos_labels = json.loads((ROOT / "content/parts-of-speech.json").read_text())


def norm(text):
    return unicodedata.normalize("NFC", text).strip()


def dump(path, value, prefix=""):
    path.write_text(prefix + json.dumps(value, ensure_ascii=False, indent=2) + (";" if prefix else "") + "\n")


registry, counts, all_terms, duplicates = [], [], set(), []
for number, title in enumerate(TITLES, 1):
    examples = json.loads((ROOT / f"content/examples/unit{number}.json").read_text())
    example_by_card = {}
    for example in examples:
        assert example["kind"] in ["book", "adapted", "practice"]
        assert all(example.get(k) for k in ["id", "text", "translation", "source", "cards"])
        for card_id in example["cards"]:
            assert card_id not in example_by_card, (number, "Duplicate example assignment", card_id)
            example_by_card[card_id] = example
    used_example_cards = set()
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
        assert len(parts) == 5, (number, line_number, "Expected term|meaning|type|example|part of speech")
        term, meaning = parts[:2]
        key = term.casefold()
        assert term and meaning
        if key in seen[skill]:
            duplicates.append([number, skill, term])
            continue
        seen[skill].add(key)
        kind = parts[2] if len(parts) > 2 and parts[2] else ("structure" if "..." in term or "+ V-ing" in term else "phrase" if " " in term else "word")
        assert kind in ["word", "phrase", "collocation", "structure"]
        pos = parts[4]
        assert pos in pos_labels, (number, line_number, "Invalid part of speech", pos)
        word = {"id": f"u{number}-{skill}-{hashlib.sha256(key.encode()).hexdigest()[:12]}",
                "word": term, "meaning": meaning, "type": kind, "pos": pos}
        assert key in pronunciations, (number, term, "Missing IPA")
        word["ipa"] = norm(pronunciations[key])
        assert word["id"] in example_by_card, (number, term, "Missing bilingual example")
        example = example_by_card[word["id"]]
        word.update(example=norm(example["text"]), exampleTranslation=norm(example["translation"]),
                    exampleKind=example["kind"], exampleSource=norm(example["source"]), exampleId=example["id"])
        used_example_cards.add(word["id"])
        group["words"].append(word)
        all_terms.add(key)
    assert used_example_cards == set(example_by_card), (number, "Example assigned to unknown card")
    unit = {"id": f"unit-{number}", "number": number, "title": title, "sections": list(sections.values())}
    per_skill = {key: sum(len(g["words"]) for g in s["groups"]) for key, s in sections.items()}
    unit["count"] = sum(per_skill.values())
    dump(ROOT / f"data/unit{number}.js", unit, "export default ")
    registry.append({"id": unit["id"], "number": number, "title": title, "count": unit["count"],
                     "module": f"./data/unit{number}.js?v={VERSION}"})
    counts.append({"unit": number, "total": unit["count"], **per_skill})
dump(ROOT / "data/units.js", registry, "export const unitsRegistry = ")
dump(ROOT / "data/parts-of-speech.js", pos_labels, "export const posLabels = ")
stats = {"version": VERSION, "units": 8, "skills": 32, "total": sum(u["total"] for u in counts),
         "uniqueTerms": len(all_terms), "perUnit": counts}
dump(ROOT / "data/stats.json", stats)
print(json.dumps({**stats, "duplicatesRemoved": duplicates}, ensure_ascii=False, indent=2))
