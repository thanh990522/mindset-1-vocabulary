import assert from 'node:assert/strict';
import { unitsRegistry } from '../data/units.js';

const unitIds = new Set();
let terms = 0;
for (const entry of unitsRegistry) {
  assert(!unitIds.has(entry.id), `Duplicate unit: ${entry.id}`);
  unitIds.add(entry.id);
  const { default: unit } = await import(new URL(`../${entry.module}`, import.meta.url));
  assert.equal(unit.id, entry.id);
  assert.equal(unit.title, entry.title);
  const sectionIds = new Set();
  for (const section of unit.sections) {
    assert(section.words.length > 0, `Empty section: ${unit.id}/${section.id}`);
    assert(!sectionIds.has(section.id), `Duplicate section: ${section.id}`);
    sectionIds.add(section.id);
    const words = new Set();
    const meanings = new Set();
    for (const word of section.words) {
      const context = `${unit.id}/${section.id}/${word.word}`;
      for (const field of ['word', 'ipa', 'pos', 'meaning', 'example', 'translation']) {
        assert(typeof word[field] === 'string' && word[field].trim(), `${context}: missing ${field}`);
        assert(!/undefined|null|®|depending on dialects/.test(word[field]), `${context}: corrupt ${field}`);
      }
      assert(/^\/[^/]+\/$/.test(word.ipa), `${context}: malformed IPA`);
      assert(!words.has(word.word.toLowerCase()), `${context}: duplicate term`);
      assert(!meanings.has(word.meaning.toLowerCase()), `${context}: ambiguous matching answer`);
      assert(word.translation.toLowerCase() !== word.word.toLowerCase(), `${context}: untranslated example`);
      words.add(word.word.toLowerCase());
      meanings.add(word.meaning.toLowerCase());
      terms++;
    }
  }
}
console.log(`Validated ${unitsRegistry.length} units and ${terms} learning entries.`);
