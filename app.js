import { availableUnits, unitsRegistry } from "./data/units.js";

const CAMBRIDGE_DICTIONARY_BASE = "https://dictionary.cambridge.org/dictionary/english/";
const STORAGE_KEY = "mindset-1-vocabulary-progress-v1";
const ROUND_SIZE = 6;

const sectionTabs = document.querySelector("#section-tabs");
const modeTabs = [...document.querySelectorAll(".mode-tab")];
const modeContent = document.querySelector("#mode-content");
const sectionIcon = document.querySelector("#section-icon");
const sectionKicker = document.querySelector("#section-kicker");
const sectionTitle = document.querySelector("#section-title");
const sectionDescription = document.querySelector("#section-description");
const sectionCount = document.querySelector("#section-count");
const overallProgressText = document.querySelector("#overall-progress-text");
const overallProgressBar = document.querySelector("#overall-progress-bar");
const toast = document.querySelector("#toast");
const unitSelect = document.querySelector("#unit-select");
const courseStatus = document.querySelector("#course-status");
const unitHeading = document.querySelector("#unit-heading");
const heroUnitNumber = document.querySelector("#hero-unit-number");
const heroUnitTitle = document.querySelector("#hero-unit-title");
const heroUnitSubtitle = document.querySelector("#hero-unit-subtitle");
const heroSectionCount = document.querySelector("#hero-section-count");
const heroWordCount = document.querySelector("#hero-word-count");

let unit = null;

const state = {
  activeSection: 0,
  mode: "learn",
  learned: loadLearnedWords(),
  flashDecks: new Map(),
  flashIndexes: new Map(),
  matching: new Map(),
  toastTimer: null,
  activeAudio: null,
  loadSequence: 0,
  matchingTimer: null
};

function loadLearnedWords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function saveLearnedWords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.learned]));
  } catch {
    showToast("Your progress is available for this session. Browser storage is unavailable.");
  }
}

function wordKey(section, word) {
  return `${unit.id}:${section.id}:${word.word}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function currentSection() {
  return unit.sections[state.activeSection];
}

function validateUnit(candidate) {
  if (!candidate || !candidate.id || !candidate.number || !candidate.title || !Array.isArray(candidate.sections) || !candidate.sections.length) {
    throw new Error("The unit data does not follow the required schema.");
  }

  candidate.sections.forEach((section) => {
    if (!section.id || !section.label || !Array.isArray(section.words)) {
      throw new Error(`Invalid section data in ${candidate.id}.`);
    }
  });
}

async function loadUnit(unitId, { updateHistory = true } = {}) {
  const fallback = availableUnits()[0];
  const requested = unitsRegistry.find((item) => item.id === unitId);
  const target = requested?.status === "available" && requested.module ? requested : fallback;

  if (!target) {
    throw new Error("No vocabulary unit is currently available.");
  }

  stopPronunciation();
  window.clearTimeout(state.matchingTimer);
  const sequence = ++state.loadSequence;
  const unitModule = await import(target.module);
  if (sequence !== state.loadSequence) return;
  validateUnit(unitModule.default);
  unit = unitModule.default;
  state.activeSection = 0;
  state.mode = "learn";
  state.flashDecks.clear();
  state.flashIndexes.clear();
  state.matching.clear();

  if (updateHistory || window.location.hash !== `#${unit.id}`) {
    window.history.replaceState(null, "", `#${unit.id}`);
  }

  renderAll();
}

function renderUnitSelector() {
  unitSelect.innerHTML = unitsRegistry.map((item) => {
    const available = item.status === "available" && item.module;
    const suffix = available ? "Available" : "Coming soon";
    return `<option value="${item.id}" ${item.id === unit.id ? "selected" : ""} ${available ? "" : "disabled"}>${item.icon} Unit ${item.number} — ${escapeHtml(item.title)} (${suffix})</option>`;
  }).join("");

  const ready = availableUnits().length;
  courseStatus.innerHTML = `<strong>${ready}/${unitsRegistry.length}</strong><span>units available</span>`;
}

function updateUnitShell() {
  const totalWords = unit.sections.reduce((sum, section) => sum + section.words.length, 0);
  heroUnitNumber.textContent = `Unit ${unit.number}:`;
  heroUnitTitle.textContent = unit.title;
  heroUnitSubtitle.textContent = unit.subtitle;
  heroSectionCount.textContent = unit.sections.length;
  heroWordCount.textContent = totalWords;
  unitHeading.textContent = `Unit ${unit.number}: Choose a section`;
  sectionTabs.setAttribute("aria-label", `Unit ${unit.number} vocabulary sections`);
  document.title = `Unit ${unit.number}: ${unit.title} | Mindset 1 Vocabulary`;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function dictionaryUrl(word) {
  const lookup = word.dictionaryWord || word.audioWord || word.word.split("/")[0].trim();
  const slug = lookup
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${CAMBRIDGE_DICTIONARY_BASE}${slug}`;
}

function stopPronunciation() {
  window.speechSynthesis?.cancel();
  state.activeAudio = null;
  document.querySelectorAll(".audio-button.playing").forEach(button => button.classList.remove("playing"));
}

function playPronunciation(word, button) {
  stopPronunciation();
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showToast("This browser cannot play speech. Use the dictionary link to listen.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word.audioWord || word.word);
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(item => item.lang.replace("_", "-").toLowerCase() === "en-us")
    || voices.find(item => item.lang.toLowerCase().startsWith("en"));
  if (voices.length && !voice) {
    showToast("No English voice is installed. Use the dictionary link to listen.");
    return;
  }
  utterance.lang = voice?.lang || "en-US";
  utterance.voice = voice || null;
  utterance.rate = 0.82;
  state.activeAudio = utterance;
  button?.classList.add("playing");
  const finish = () => {
    if (state.activeAudio !== utterance) return;
    button?.classList.remove("playing");
    state.activeAudio = null;
  };
  utterance.onend = finish;
  utterance.onerror = event => {
    finish();
    if (!["canceled", "interrupted"].includes(event.error)) showToast("Speech is unavailable. Use the dictionary link to listen.");
  };
  window.speechSynthesis.speak(utterance);
}

function renderSectionTabs() {
  sectionTabs.innerHTML = unit.sections.map((section, index) => {
    const learnedCount = section.words.filter((word) => state.learned.has(wordKey(section, word))).length;
    return `
      <button
        type="button"
        class="section-tab ${index === state.activeSection ? "active" : ""}"
        data-section-index="${index}"
        data-color="${section.color}"
        aria-pressed="${index === state.activeSection}"
      >
        <span aria-hidden="true">${section.icon}</span>
        <span><b>${section.label}</b><small>${learnedCount}/${section.words.length} learned</small></span>
        <i class="tab-status ${learnedCount ? "has-progress" : ""}" aria-hidden="true"></i>
      </button>
    `;
  }).join("");

  sectionTabs.querySelectorAll(".section-tab").forEach((button) => {
    button.addEventListener("click", () => {
      stopPronunciation();
      window.clearTimeout(state.matchingTimer);
      state.activeSection = Number(button.dataset.sectionIndex);
      state.mode = "learn";
      renderAll();
    });
  });
}

function renderSectionHeading() {
  const section = currentSection();
  sectionIcon.textContent = section.icon;
  sectionKicker.textContent = `Unit ${unit.number} • ${section.label}`;
  sectionTitle.textContent = section.title || `${section.label} Vocabulary`;
  sectionDescription.textContent = `Study ${section.words.length} terms with IPA, Vietnamese meanings and examples. Then practise with flashcards and matching.`;
  sectionCount.textContent = `${section.words.length} terms`;
}

function updateModeTabs() {
  modeTabs.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateOverallProgress() {
  const total = unit.sections.reduce((sum, section) => sum + section.words.length, 0);
  const learned = unit.sections.reduce(
    (sum, section) => sum + section.words.filter((word) => state.learned.has(wordKey(section, word))).length,
    0
  );
  overallProgressText.textContent = `${learned} / ${total} learned`;
  overallProgressBar.style.width = `${Math.round((learned / total) * 100)}%`;
}

function renderLearn(query = "") {
  const oldSearch = document.querySelector("#vocab-search");
  const hadFocus = document.activeElement === oldSearch && oldSearch !== null;
  const cursor = hadFocus ? oldSearch.selectionStart : null;
  const section = currentSection();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWords = section.words.filter((word) =>
    [word.word, word.meaning, word.pos, word.definition, word.note, word.source]
      .some((field) => String(field ?? "").toLowerCase().includes(normalizedQuery))
  );

  modeContent.innerHTML = `
    <div class="learn-tools">
      <p>Tap <strong>🔊 Listen</strong> to listen. Mark each word when you feel confident.</p>
      <label class="search-box">
        <span aria-hidden="true">🔎</span>
        <input id="vocab-search" type="search" value="${escapeHtml(query)}" placeholder="Search English or Vietnamese…" aria-label="Search vocabulary" />
      </label>
    </div>
    <div class="vocab-grid">
      ${filteredWords.length ? filteredWords.map((word) => renderVocabCard(section, word)).join("") : `
        <div class="empty-state"><span>🕵️</span>No vocabulary matches your search.</div>
      `}
    </div>
  `;

  document.querySelector("#vocab-search").addEventListener("input", (event) => renderLearn(event.target.value));
  if (hadFocus) {
    const search = document.querySelector("#vocab-search");
    search.focus();
    if (cursor !== null) search.setSelectionRange(cursor, cursor);
  }
  bindAudioButtons();

  modeContent.querySelectorAll(".learn-button").forEach((button) => {
    button.addEventListener("click", () => {
      const word = section.words[Number(button.dataset.wordIndex)];
      const key = wordKey(section, word);
      if (state.learned.has(key)) state.learned.delete(key);
      else state.learned.add(key);
      saveLearnedWords();
      renderLearn(document.querySelector("#vocab-search")?.value || "");
      renderSectionTabs();
      updateOverallProgress();
    });
  });
}

function renderVocabCard(section, word) {
  const index = section.words.indexOf(word);
  const learned = state.learned.has(wordKey(section, word));
  const bandClass = String(word.band || "Core").toLowerCase();
  return `
    <article class="vocab-card ${learned ? "learned" : ""}">
      <div class="word-row">
        <span class="word-emoji" aria-hidden="true">${word.icon}</span>
        <div class="word-text">
          <h3>${escapeHtml(word.word)}</h3>
          <p>${escapeHtml(word.ipa)}</p>
        </div>
        <button class="audio-button" type="button" data-word-index="${index}" aria-label="Play the pronunciation of ${escapeHtml(word.word)}">🔊 Listen</button>
      </div>
      <div class="word-badges">
        <span class="number-badge">No. ${index + 1}</span>
        <span class="pos-badge">${escapeHtml(word.pos)}</span>
        ${word.level ? `<span class="level-badge">CEFR ${escapeHtml(word.level)}</span>` : ""}
        ${word.band ? `<span class="band-badge ${escapeHtml(bandClass)}">${escapeHtml(word.band)}</span>` : ""}
      </div>
      ${word.note ? `<p class="word-note">${escapeHtml(word.note)}</p>` : ""}
      ${word.definition ? `<p class="definition">${escapeHtml(word.definition)}</p>` : ""}
      <p class="meaning">🇻🇳 ${escapeHtml(word.meaning)}</p>
      <p class="example">“${escapeHtml(word.example)}”
        ${word.translation ? `<em>${escapeHtml(word.translation)}</em>` : ""}
        ${word.source ? `<small class="book-source">📘 ${escapeHtml(word.source)}</small>` : ""}
      </p>
      <div class="card-actions">
        <a class="dictionary-link" href="${dictionaryUrl(word)}" target="_blank" rel="noopener noreferrer">Dictionary ↗</a>
        <button class="learn-button ${learned ? "is-learned" : ""}" type="button" data-word-index="${index}">${learned ? "✓ Learned" : "+ Mark learned"}</button>
      </div>
    </article>
  `;
}

function getFlashDeck(section) {
  if (!state.flashDecks.has(section.id)) {
    state.flashDecks.set(section.id, shuffle(section.words.map((_, index) => index)));
    state.flashIndexes.set(section.id, 0);
  }
  return state.flashDecks.get(section.id);
}

function renderFlashcards() {
  const section = currentSection();
  const deck = getFlashDeck(section);
  const index = state.flashIndexes.get(section.id) || 0;
  const wordIndex = deck[index];
  const word = section.words[wordIndex];
  const progress = Math.round(((index + 1) / deck.length) * 100);

  modeContent.innerHTML = `
    <div class="flash-toolbar">
      <p>Say the word aloud, flip the card, and check your memory.</p>
      <button id="shuffle-cards" class="soft-button" type="button">🔀 Shuffle deck</button>
    </div>
    <div class="flash-layout">
      <div class="flash-stage">
        <button id="flashcard" class="flashcard" type="button" aria-label="Flip the flashcard">
          <span class="flashcard-inner">
            <span class="flash-face flash-front">
              <span class="flash-emoji" aria-hidden="true">${word.icon}</span>
              <h3>${escapeHtml(word.word)}</h3>
              <span class="flash-ipa">${escapeHtml(word.ipa)}</span>
              <span class="flash-level">${escapeHtml(word.pos)}</span>
              <span class="flip-hint">Tap to reveal the meaning ↻</span>
            </span>
            <span class="flash-face flash-back">
              <span class="flash-emoji" aria-hidden="true">${word.icon}</span>
              <h3>${escapeHtml(word.word)}</h3>
              ${word.definition ? `<p class="flash-definition">${escapeHtml(word.definition)}</p>` : ""}
              <p class="flash-meaning">${escapeHtml(word.meaning)}</p>
              <p class="flash-example">${escapeHtml(word.example)}</p>
              <p class="flash-translation">${escapeHtml(word.translation)}</p>
              ${word.source ? `<small class="flash-book-source">📘 ${escapeHtml(word.source)}</small>` : ""}
              <span class="flip-hint" style="color:#71859a">Tap to see the front ↻</span>
            </span>
          </span>
        </button>
      </div>
      <aside class="flash-side">
        <div class="flash-counter"><span>Card progress</span><strong>${index + 1} / ${deck.length}</strong></div>
        <div class="flash-progress"><span style="width:${progress}%"></span></div>
        <div class="flash-controls">
          <button id="previous-card" class="soft-button" type="button" ${index === 0 ? "disabled" : ""}>← Previous</button>
          <button id="next-card" class="primary-button" type="button">${index === deck.length - 1 ? "Restart ↻" : "Next →"}</button>
          <button class="audio-button wide" type="button" data-word-index="${wordIndex}">🔊 Listen</button>
        </div>
        <p class="flash-source">Listen with your device’s English voice. Read the example aloud, too.</p>
      </aside>
    </div>
  `;

  document.querySelector("#flashcard").addEventListener("click", (event) => event.currentTarget.classList.toggle("flipped"));
  document.querySelector("#previous-card").addEventListener("click", () => {
    state.flashIndexes.set(section.id, Math.max(0, index - 1));
    renderFlashcards();
  });
  document.querySelector("#next-card").addEventListener("click", () => {
    state.flashIndexes.set(section.id, index === deck.length - 1 ? 0 : index + 1);
    renderFlashcards();
  });
  document.querySelector("#shuffle-cards").addEventListener("click", () => {
    state.flashDecks.set(section.id, shuffle(section.words.map((_, itemIndex) => itemIndex)));
    state.flashIndexes.set(section.id, 0);
    showToast("Flashcards shuffled! 🎉");
    renderFlashcards();
  });
  bindAudioButtons();
}

function getMatchingState(section) {
  if (!state.matching.has(section.id)) {
    state.matching.set(section.id, {
      order: shuffle(section.words.map((_, index) => index)),
      roundStart: 0,
      meaningOrder: [],
      selectedWord: null,
      selectedMeaning: null,
      matched: new Set(),
      wrongWord: null,
      wrongMeaning: null,
      totalCorrect: 0,
      completed: false
    });
  }
  return state.matching.get(section.id);
}

function prepareMeaningOrder(matchState) {
  const roundIds = matchState.order.slice(matchState.roundStart, matchState.roundStart + ROUND_SIZE);
  if (!matchState.meaningOrder.length || !matchState.meaningOrder.every((id) => roundIds.includes(id))) {
    matchState.meaningOrder = shuffle(roundIds);
  }
  return roundIds;
}

function renderMatching() {
  const section = currentSection();
  const matchState = getMatchingState(section);

  if (matchState.completed) {
    modeContent.innerHTML = `
      <div class="round-complete" style="margin-top:20px">
        <span>🏆</span>
        <h3>Section complete!</h3>
        <p>You matched all ${section.words.length} words in ${Math.ceil(section.words.length / ROUND_SIZE)} rounds.</p>
        <button id="replay-matching" class="next-round-button" type="button">Play again 🔄</button>
      </div>
    `;
    document.querySelector("#replay-matching").addEventListener("click", () => {
      state.matching.delete(section.id);
      renderMatching();
    });
    return;
  }

  const roundIds = prepareMeaningOrder(matchState);
  const roundNumber = Math.floor(matchState.roundStart / ROUND_SIZE) + 1;
  const totalRounds = Math.ceil(section.words.length / ROUND_SIZE);
  const roundComplete = roundIds.every((id) => matchState.matched.has(id));

  modeContent.innerHTML = `
    <div class="matching-topbar">
      <div class="matching-instructions"><span>💡</span><span>Choose one English word, then choose its Vietnamese meaning. Each round contains up to ${ROUND_SIZE} pairs.</span></div>
      <div class="matching-status">
        <span class="round-chip">Round ${roundNumber}/${totalRounds}</span>
        <span class="score-chip">✓ ${matchState.totalCorrect}/${section.words.length}</span>
      </div>
    </div>
    <div class="matching-board">
      <div class="match-column">
        <p class="column-title">English words</p>
        ${roundIds.map((id) => renderMatchOption(section.words[id].word, id, "word", matchState)).join("")}
      </div>
      <div class="match-column">
        <p class="column-title">Vietnamese meanings</p>
        ${matchState.meaningOrder.map((id) => renderMatchOption(section.words[id].meaning, id, "meaning", matchState)).join("")}
      </div>
    </div>
    ${roundComplete ? `
      <div class="round-complete">
        <span>${roundNumber === totalRounds ? "🏆" : "🌟"}</span>
        <h3>${roundNumber === totalRounds ? "Amazing work!" : "Round complete!"}</h3>
        <p>${roundNumber === totalRounds ? "You matched every word in this section." : "Ready for the next set of words?"}</p>
        <button id="next-matching-round" class="next-round-button" type="button">${roundNumber === totalRounds ? "Finish section" : "Next round →"}</button>
      </div>
    ` : ""}
  `;

  modeContent.querySelectorAll(".match-option").forEach((button) => {
    button.addEventListener("click", () => selectMatchOption(button.dataset.type, Number(button.dataset.id)));
  });

  document.querySelector("#next-matching-round")?.addEventListener("click", () => {
    if (roundNumber === totalRounds) {
      matchState.completed = true;
    } else {
      matchState.roundStart += ROUND_SIZE;
      matchState.meaningOrder = [];
      matchState.selectedWord = null;
      matchState.selectedMeaning = null;
    }
    renderMatching();
  });
}

function renderMatchOption(text, id, type, matchState) {
  const isSelected = type === "word" ? matchState.selectedWord === id : matchState.selectedMeaning === id;
  const isWrong = type === "word" ? matchState.wrongWord === id : matchState.wrongMeaning === id;
  const isMatched = matchState.matched.has(id);
  return `
    <button
      type="button"
      class="match-option ${isSelected ? "selected" : ""} ${isWrong ? "wrong" : ""} ${isMatched ? "matched" : ""}"
      data-type="${type}"
      data-id="${id}"
      ${isMatched ? "disabled" : ""}
    >${isMatched ? "✓ " : ""}${escapeHtml(text)}</button>
  `;
}

function selectMatchOption(type, id) {
  const section = currentSection();
  const matchState = getMatchingState(section);

  if (type === "word") matchState.selectedWord = id;
  else matchState.selectedMeaning = id;

  if (matchState.selectedWord !== null && matchState.selectedMeaning !== null) {
    if (matchState.selectedWord === matchState.selectedMeaning) {
      const matchedId = matchState.selectedWord;
      matchState.matched.add(matchedId);
      matchState.totalCorrect += 1;
      matchState.selectedWord = null;
      matchState.selectedMeaning = null;
      state.learned.add(wordKey(section, section.words[matchedId]));
      saveLearnedWords();
      renderSectionTabs();
      updateOverallProgress();
      showToast("Correct match! ⭐");
      renderMatching();
      return;
    }

    matchState.wrongWord = matchState.selectedWord;
    matchState.wrongMeaning = matchState.selectedMeaning;
    matchState.selectedWord = null;
    matchState.selectedMeaning = null;
    renderMatching();
    window.clearTimeout(state.matchingTimer);
    const activeUnitId = unit.id;
    state.matchingTimer = window.setTimeout(() => {
      matchState.wrongWord = null;
      matchState.wrongMeaning = null;
      if (unit.id === activeUnitId && currentSection() === section && state.mode === "matching") renderMatching();
    }, 520);
    return;
  }

  renderMatching();
}

function bindAudioButtons() {
  const section = currentSection();
  modeContent.querySelectorAll(".audio-button[data-word-index]").forEach((button) => {
    button.addEventListener("click", () => playPronunciation(section.words[Number(button.dataset.wordIndex)], button));
  });
}

function renderMode() {
  if (state.mode === "flashcards") renderFlashcards();
  else if (state.mode === "matching") renderMatching();
  else renderLearn();
}

function renderAll() {
  updateUnitShell();
  renderUnitSelector();
  renderSectionTabs();
  renderSectionHeading();
  updateModeTabs();
  updateOverallProgress();
  renderMode();
}

modeTabs.forEach((button) => {
  button.addEventListener("click", () => {
    stopPronunciation();
    window.clearTimeout(state.matchingTimer);
    state.mode = button.dataset.mode;
    updateModeTabs();
    renderMode();
  });
});

unitSelect.addEventListener("change", () => {
  loadUnit(unitSelect.value).catch((error) => {
    showToast(error.message);
    renderUnitSelector();
  });
});

window.addEventListener("hashchange", () => {
  const requestedId = window.location.hash.slice(1);
  if (requestedId && requestedId !== unit?.id) {
    loadUnit(requestedId, { updateHistory: false }).catch((error) => showToast(error.message));
  }
});

const requestedUnitId = window.location.hash.slice(1) || availableUnits()[0]?.id;
loadUnit(requestedUnitId).catch((error) => {
  modeContent.innerHTML = `<div class="empty-state"><span>⚠️</span>${escapeHtml(error.message)}</div>`;
});

