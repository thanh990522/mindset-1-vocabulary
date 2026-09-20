import { unitsRegistry } from "./data/units.js?v=20260920-1";
import { posLabels } from "./data/parts-of-speech.js?v=20260920-1";

const $ = (selector) => document.querySelector(selector);
const PAGE_SIZE = 12;
const STORAGE_KEY = "mindset-1-vocabulary-progress-v2";
const OLD_KEY = "mindset-1-vocabulary-progress-v1";
const labels = { word: "Từ đơn", phrase: "Cụm từ", collocation: "Collocation", structure: "Cấu trúc" };
const state = { units: [], unit: null, skill: "reading", page: 1, group: "all", query: "", type: "all", status: "all", direction: "en", learned: new Set(), shuffled: null, flipped: new Set() };
let toastTimer;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function searchKey(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[’‘]/g, "'").trim();
}

function sectionWords(section) {
  return section.groups.flatMap((group) => group.words.map((word) => ({ ...word, groupId: group.id, groupTitle: group.title, source: group.source, origin: group.origin })));
}

function currentSection() { return state.unit.sections.find((section) => section.id === state.skill); }
function currentWords() { return sectionWords(currentSection()); }

function notify(message) {
  const toast = $("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, learned: [...state.learned] })); }
  catch { notify("Trình duyệt chưa cho lưu dữ liệu. Tiến độ vẫn được giữ trong phiên này."); }
}

function restoreProgress() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { /* Start clean if data is unavailable or corrupt. */ }
  const allIds = new Set(state.units.flatMap((unit) => unit.sections.flatMap(sectionWords).map((word) => word.id)));
  if (saved?.version === 2 && Array.isArray(saved.learned)) {
    state.learned = new Set(saved.learned.filter((id) => typeof id === "string" && allIds.has(id)));
    return;
  }
  // Migrate only once; a later unmark must survive a reload.
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || "[]");
    if (Array.isArray(old)) {
      const oldTerms = new Set(old.filter((key) => typeof key === "string").map((key) => {
        const [unitId, , ...term] = key.split(":");
        return `${unitId}:${searchKey(term.join(":"))}`;
      }));
      for (const unit of state.units) for (const word of unit.sections.flatMap(sectionWords)) {
        if (oldTerms.has(`${unit.id}:${searchKey(word.word)}`)) state.learned.add(word.id);
      }
    }
  } catch { /* A blocked storage API does not block studying. */ }
  saveProgress();
}

function filteredWords() {
  let words = currentWords();
  if (state.group !== "all") words = words.filter((word) => word.groupId === state.group);
  if (state.type !== "all") words = words.filter((word) => state.type === "phrase" ? ["phrase", "collocation"].includes(word.type) : word.type === state.type);
  if (state.status !== "all") words = words.filter((word) => state.learned.has(word.id) === (state.status === "learned"));
  const terms = searchKey(state.query).split(/\s+/).filter(Boolean);
  if (terms.length) words = words.filter((word) => {
    const haystack = searchKey([word.word, word.meaning, word.example || "", word.exampleTranslation || "", word.groupTitle].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
  if (state.shuffled) words.sort((a, b) => state.shuffled.get(a.id) - state.shuffled.get(b.id));
  return words;
}

function updateProgress() {
  const all = state.unit.sections.flatMap(sectionWords);
  const done = all.filter((word) => state.learned.has(word.id)).length;
  $("#progress-text").textContent = `${done} / ${all.length} thẻ đã nhớ trong Unit`;
  $("#unit-progress").max = all.length;
  $("#unit-progress").value = done;
  const words = currentWords();
  $("#skill-progress").textContent = `${words.filter((word) => state.learned.has(word.id)).length} / ${words.length} đã nhớ`;
}

const skillIcons = {
  reading: '<path d="M12 6v14m0-14C8 3 4 4 2 5v14c3-2 7-2 10 1 3-3 7-3 10-1V5c-2-1-6-2-10 1Z"/>',
  listening: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="12" width="5" height="9" rx="2"/><rect x="17" y="12" width="5" height="9" rx="2"/>',
  speaking: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z"/><path d="M8 10h8m-8 4h5"/>',
  writing: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"/>'
};
function skillIcon(skill) { return `<svg class="skill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${skillIcons[skill]}</svg>`; }
const speakerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';

function cardHTML(word) {
  const learned = state.learned.has(word.id);
  const flipped = state.flipped.has(word.id);
  const english = `<span class="term" lang="en">${escapeHTML(word.word)}</span>${word.ipa ? `<span class="ipa" lang="en">${escapeHTML(word.ipa)}</span>` : ""}`;
  const vietnamese = `<span class="meaning" lang="vi">${escapeHTML(word.meaning)}</span>`;
  const example = word.example ? `<span class="example"><span class="example-label">Ví dụ</span><span lang="en">${escapeHTML(word.example)}</span></span>${word.exampleTranslation ? `<span class="example-translation" lang="vi">${escapeHTML(word.exampleTranslation)}</span>` : ""}` : "";
  const primary = state.direction === "en" ? word.word : word.meaning;

  return `<article class="vocab-card${learned ? " is-learned" : ""}" data-card="${word.id}">
    <div class="card-meta"><span class="card-topic" lang="en" title="${escapeHTML(word.groupTitle)}">${escapeHTML(word.groupTitle)}</span><span class="card-pos" title="Loại từ: ${posLabels[word.pos]} · ${labels[word.type]}">${posLabels[word.pos]}</span></div>
    <button class="flip${flipped ? " is-flipped" : ""}" type="button" data-action="flip" data-id="${word.id}" aria-pressed="${flipped}" aria-label="Lật thẻ: ${escapeHTML(primary)}">
      <span class="face front" aria-hidden="${flipped}">${state.direction === "en" ? english : vietnamese}<span class="flip-hint">Nhấn để xem ${state.direction === "en" ? "nghĩa" : "từ tiếng Anh"}</span></span>
      <span class="face back" aria-hidden="${!flipped}">${state.direction === "en" ? vietnamese : english}${example}<span class="flip-hint">Nhấn để lật lại</span></span>
    </button>
    <div class="card-actions"><button class="audio-button" type="button" data-action="speak" data-id="${word.id}">${speakerIcon}${word.type === "structure" && word.example ? "Nghe ví dụ" : "Nghe"}</button><button class="learn-button" type="button" data-action="learn" data-id="${word.id}" aria-pressed="${learned}">${learned ? "✓ Đã nhớ" : "+ Đánh dấu đã nhớ"}</button></div>
  </article>`;
}

function renderCards() {
  const words = filteredWords();
  const pages = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * PAGE_SIZE;
  $("#cards").innerHTML = words.length ? words.slice(start, start + PAGE_SIZE).map(cardHTML).join("") : '<div class="empty-state"><p>Không có thẻ phù hợp với bộ lọc này.</p><button type="button" data-action="reset">Xem lại tất cả thẻ</button></div>';
  $("#cards").setAttribute("aria-busy", "false");
  $("#result-count").textContent = words.length ? `${words.length} thẻ · Đang xem ${start + 1}–${Math.min(start + PAGE_SIZE, words.length)}` : "0 thẻ phù hợp";
  $("#page-count").textContent = `Trang ${state.page} / ${pages}`;
  $("#previous-page").disabled = state.page <= 1;
  $("#next-page").disabled = state.page >= pages;
  $("#shuffle").disabled = words.length < 2;
  updateProgress();
}

function resetFilters() {
  state.query = ""; state.group = "all"; state.type = "all"; state.status = "all";
  state.page = 1; state.shuffled = null; state.flipped.clear();
  $("#search").value = "";
  for (const id of ["group-select", "type-select", "status-select"]) $(`#${id}`).value = "all";
  renderCards();
}

function showSection() {
  $("#unit-select").value = state.unit.id;
  $("#unit-number").textContent = `Unit ${String(state.unit.number).padStart(2, "0")}`;
  $("#unit-title").textContent = state.unit.title;
  $("#skill-tabs").innerHTML = state.unit.sections.map((section) => `<button class="skill-tab" type="button" data-skill="${section.id}" aria-current="${section.id === state.skill}">${skillIcon(section.id)}${section.label}<small>${sectionWords(section).length}</small></button>`).join("");
  const section = currentSection();
  $("#skill-description").textContent = section.description;
  $("#group-select").innerHTML = '<option value="all">Tất cả nội dung</option>' + section.groups.map((group) => `<option value="${group.id}">${escapeHTML(group.title)} (${group.words.length})${group.origin === "extension" ? " · Bổ sung" : ""}</option>`).join("");
  resetFilters();
}

function readRoute() {
  if (state.unit && location.hash === "#cards") return;
  const skillHadFocus = document.activeElement?.matches("[data-skill]");
  const [unitId, skill] = location.hash.slice(1).split("/");
  const unit = state.units.find((candidate) => candidate.id === unitId) || state.units[0];
  const nextSkill = unit.sections.some((section) => section.id === skill) ? skill : "reading";
  if (unit !== state.unit || nextSkill !== state.skill) {
    state.unit = unit; state.skill = nextSkill;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    showSection();
    if (skillHadFocus) $(`#skill-tabs [data-skill="${state.skill}"]`).focus();
  }
}

function speak(word) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    notify("Trình duyệt này chưa hỗ trợ đọc tiếng Anh."); return;
  }
  speechSynthesis.cancel();
  const text = word.type === "structure" && word.example ? word.example : word.word.replace(/\.\.\./g, " ").replace(/\//g, ", ");
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const voice = voices.find((v) => /^en[-_]US$/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = 0.88;
  utterance.onerror = (event) => { if (!["interrupted", "canceled"].includes(event.error)) notify("Chưa phát được giọng đọc. Hãy kiểm tra giọng tiếng Anh trên thiết bị."); };
  speechSynthesis.speak(utterance);
}

$("#cards").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !state.unit) return;
  const action = button.dataset.action;
  if (action === "reset") { resetFilters(); $("#search").focus(); return; }
  const word = currentWords().find((item) => item.id === button.dataset.id);
  if (!word) return;
  if (action === "flip") {
    const flipped = !state.flipped.has(word.id);
    if (flipped) state.flipped.add(word.id); else state.flipped.delete(word.id);
    button.classList.toggle("is-flipped", flipped);
    button.setAttribute("aria-pressed", String(flipped));
    button.querySelector(".front").setAttribute("aria-hidden", String(flipped));
    button.querySelector(".back").setAttribute("aria-hidden", String(!flipped));
    const revealed = state.direction === "en" ? (flipped ? word.meaning : word.word) : (flipped ? word.word : word.meaning);
    button.setAttribute("aria-label", `${revealed}${flipped && word.example ? `. Ví dụ: ${word.example}` : ""}. Nhấn để lật lại`);
  } else if (action === "speak") speak(word);
  else if (action === "learn") {
    const learned = !state.learned.has(word.id);
    if (learned) state.learned.add(word.id); else state.learned.delete(word.id);
    saveProgress();
    if (state.status === "all") {
      button.setAttribute("aria-pressed", String(learned));
      button.textContent = learned ? "✓ Đã nhớ" : "+ Đánh dấu đã nhớ";
      button.closest("article").classList.toggle("is-learned", learned);
      updateProgress();
    } else {
      renderCards();
      ($("#cards .learn-button") || $("#status-select")).focus();
    }
  }
});

$("#skill-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-skill]");
  if (button) location.hash = `${state.unit.id}/${button.dataset.skill}`;
});
$("#unit-select").addEventListener("change", (event) => { location.hash = `${event.target.value}/${state.skill}`; });
$("#search").addEventListener("input", (event) => {
  state.query = event.target.value; state.page = 1; state.flipped.clear(); renderCards();
});
for (const [id, property] of [["group-select", "group"], ["type-select", "type"], ["status-select", "status"], ["direction", "direction"]]) {
  $(`#${id}`).addEventListener("change", (event) => {
    state[property] = event.target.value; state.page = 1; state.flipped.clear(); renderCards();
  });
}
$("#clear-filters").addEventListener("click", resetFilters);
$("#shuffle").addEventListener("click", () => {
  const deck = currentWords();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  state.shuffled = new Map(deck.map((word, index) => [word.id, index]));
  state.page = 1; state.flipped.clear(); renderCards(); notify("Đã trộn thứ tự thẻ.");
});
for (const [id, delta] of [["previous-page", -1], ["next-page", 1]]) {
  $(`#${id}`).addEventListener("click", () => {
    state.page += delta; state.flipped.clear(); renderCards();
    $("#cards").focus({ preventScroll: true });
    $("#cards").scrollIntoView({ block: "start", behavior: "instant" });
  });
}
window.addEventListener("hashchange", () => { if (state.units.length) readRoute(); });

async function init() {
  const controls = [...document.querySelectorAll("main input, main select, main button")];
  controls.forEach((control) => { control.disabled = true; });
  try {
    state.units = await Promise.all(unitsRegistry.map(async (meta) => (await import(meta.module)).default));
    restoreProgress();
    const total = state.units.reduce((sum, unit) => sum + unit.count, 0);
    $("#library-count").textContent = `${total.toLocaleString("vi-VN")} thẻ · 8 Unit · 4 kỹ năng`;
    $("#unit-select").innerHTML = state.units.map((unit) => `<option value="${unit.id}">${String(unit.number).padStart(2, "0")} · ${escapeHTML(unit.title)}</option>`).join("");
    controls.forEach((control) => { control.disabled = false; });
    readRoute();
  } catch (error) {
    console.error("Vocabulary could not be loaded", error);
    $("#cards").setAttribute("aria-busy", "false");
    $("#cards").innerHTML = '<div class="empty-state">Chưa tải được bộ thẻ. Vui lòng kiểm tra kết nối rồi tải lại trang.<button type="button" id="retry-load">Thử lại</button></div>';
    $("#retry-load").addEventListener("click", init);
  }
}
init();
