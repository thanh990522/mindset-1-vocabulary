import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { unitsRegistry } from "../data/units.js";
import { posLabels } from "../data/parts-of-speech.js";

const root = new URL("../", import.meta.url);
const stats = JSON.parse(await readFile(new URL("data/stats.json", root), "utf8"));
const ids = new Set();
const terms = new Set();
let total = 0, sections = 0, groups = 0, examples = 0, extensions = 0;
assert.equal(unitsRegistry.length, 8);
for (const meta of unitsRegistry) {
  const unit = (await import(new URL(meta.module, root))).default;
  assert.equal(unit.id, meta.id);
  assert.deepEqual(unit.sections.map(s => s.id), ["reading", "listening", "speaking", "writing"]);
  let unitTotal = 0;
  for (const section of unit.sections) {
    sections++;
    const withinSkill = new Set();
    let skillTotal = 0;
    assert.ok(section.groups.length);
    for (const group of section.groups) {
      groups++;
      assert.ok(group.title && group.words.length && /SB/.test(group.source) && /TB/.test(group.source));
      if (section.id === "reading") assert.equal(group.origin, "passage");
      if (section.id === "listening") {
        assert.equal(group.origin, "transcript");
        assert.match(group.source, /tracks?/i);
      }
      if (group.origin === "extension") assert.ok(["speaking", "writing"].includes(section.id));
      for (const word of group.words) {
        assert.ok(word.id && word.word && word.meaning, `Missing field in ${unit.id}`);
        assert.ok(!ids.has(word.id), `Duplicate id ${word.id}`); ids.add(word.id);
        const key = word.word.toLowerCase();
        assert.ok(!withinSkill.has(key), `Duplicate ${key} in ${unit.id}/${section.id}`); withinSkill.add(key);
        terms.add(key);
        assert.ok(["word", "phrase", "collocation", "structure"].includes(word.type));
        assert.ok(Object.hasOwn(posLabels, word.pos), `Missing or invalid part of speech in ${word.id}`);
        for (const text of [word.word, word.meaning, word.example || "", word.ipa || ""]) {
          assert.equal(text, text.normalize("NFC"), `Non-NFC text: ${text}`);
          assert.doesNotMatch(text, /[\u0000-\u001f\ufffd]/u, `Invalid character in ${word.id}`);
          assert.ok(!/<[^>]+>/.test(text), "Vocabulary must be plain text");
        }
        if (word.example) examples++;
        if (group.origin === "extension") extensions++;
        skillTotal++;
      }
    }
    assert.ok(skillTotal >= 25, `${unit.id}/${section.id} unexpectedly sparse`);
    assert.equal(skillTotal, stats.perUnit[unit.number - 1][section.id]);
    unitTotal += skillTotal;
  }
  assert.equal(unitTotal, unit.count);
  assert.equal(unitTotal, meta.count);
  total += unitTotal;
}
assert.equal(total, stats.total);
assert.equal(terms.size, stats.uniqueTerms);
assert.equal(sections, 32);
console.log(JSON.stringify({ passed: true, units: unitsRegistry.length, sections, groups, total, uniqueTerms: terms.size, examples, extensionCards: extensions }, null, 2));
