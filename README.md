# Mindset for IELTS 1 Vocabulary

Vocabulary website for Mr. Hà Chí Thanh, based on **Mindset 1 Vocab List.docx**.

The layout, colour palette and three learning modes follow [PIS Vocabulary](https://github.com/thanh990522/pis-vocabulary).

- 8 units, 29 sections, 325 learning entries (307 distinct words and phrases).
- IPA, word class, Vietnamese meaning, English example and Vietnamese translation.
- Learn, shuffled flashcards, and matching in rounds of up to six pairs.
- English pronunciation using the device's speech synthesis, preferring a US voice; dictionary links remain available.
- Progress stored in this browser under a Mindset-specific key. No account needed.

## Preview and validation

Serve the repository with any static HTTP server, for example `python -m http.server 8000`, then open `http://localhost:8000`.

Run `npm test` to validate all unit data. No dependencies or build step are required.

## Data

Edit `data/unit1.js` through `data/unit8.js`. `data/units.js` defines the course navigation. See [CONTENT_NOTES.md](CONTENT_NOTES.md) for editorial changes.

GitHub Pages deployment is configured in `.github/workflows/pages.yml`.
