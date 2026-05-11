/**
 * FinMot — Application principale
 */

import { GameState, MAX_ATTEMPTS, WORD_LENGTH } from "./game.js";
import { recordGame, loadStats, loadLastGame, saveLastGame, isAlreadyPlayedToday, getTodayString } from "./stats.js";
import { buildShareText, share } from "./share.js";
import { t } from "./i18n.js";

const KEYBOARD_LAYOUT = [
  ["A","Z","E","R","T","Y","U","I","O","P"],
  ["Q","S","D","F","G","H","J","K","L","M"],
  ["ENTER","W","X","C","V","B","N","BACK"]
];

class App {
  constructor() {
    this.game = new GameState();
    this.boardEl = document.getElementById("board");
    this.keyboardEl = document.getElementById("keyboard");
    this.toastEl = document.getElementById("toast");
    this.statsModal = document.getElementById("stats-modal");
    this.rulesModal = document.getElementById("rules-modal");
    this.resultModal = document.getElementById("result-modal");
    this.headerDay = document.getElementById("header-day");
  }

  init() {
    this.localizeStaticUI();
    this.renderBoard();
    this.renderKeyboard();
    this.bindEvents();
    this.headerDay.textContent = `#${this.game.dayNumber}`;

    // Restore previous game if same day
    const last = loadLastGame();
    if (last && last.date === getTodayString()) {
      this.restoreGame(last);
    }

    // First launch : show rules
    if (!localStorage.getItem("finmot.seenRules")) {
      this.openModal(this.rulesModal);
      localStorage.setItem("finmot.seenRules", "1");
    }
  }

  localizeStaticUI() {
    document.title = `${t("appName")} — ${t("tagline")}`;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
  }

  restoreGame(last) {
    for (const g of last.guesses) {
      this.game.guesses.push(g);
    }
    this.game.status = last.status;
    this.renderBoard();
    this.renderKeyboard();
    if (last.status !== "playing") {
      this.showResult(last.status === "won");
    }
  }

  renderBoard() {
    this.boardEl.innerHTML = "";
    for (let row = 0; row < MAX_ATTEMPTS; row++) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";

      const guess = this.game.guesses[row];
      const isCurrent = row === this.game.guesses.length && this.game.status === "playing";
      const inputArr = isCurrent ? this.game.currentInput.split("") : [];

      for (let col = 0; col < WORD_LENGTH; col++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        if (guess) {
          tile.textContent = guess.word[col];
          tile.classList.add("revealed", guess.result[col]);
          tile.style.transitionDelay = `${col * 100}ms`;
        } else if (isCurrent && inputArr[col]) {
          tile.textContent = inputArr[col];
          tile.classList.add("filled");
        }
        rowEl.appendChild(tile);
      }
      this.boardEl.appendChild(rowEl);
    }
  }

  renderKeyboard() {
    this.keyboardEl.innerHTML = "";
    const keyboardState = this.game.getKeyboardState();

    for (const row of KEYBOARD_LAYOUT) {
      const rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      for (const key of row) {
        const btn = document.createElement("button");
        btn.className = "key";
        btn.dataset.key = key;
        if (key === "BACK") {
          btn.classList.add("key-wide");
          btn.innerHTML = "⌫";
          btn.setAttribute("aria-label", "Backspace");
        } else if (key === "ENTER") {
          btn.classList.add("key-wide");
          btn.textContent = t("enter");
        } else {
          btn.textContent = key;
          if (keyboardState[key]) {
            btn.classList.add(keyboardState[key]);
          }
        }
        rowEl.appendChild(btn);
      }
      this.keyboardEl.appendChild(rowEl);
    }
  }

  bindEvents() {
    // Keyboard taps
    this.keyboardEl.addEventListener("click", e => {
      const btn = e.target.closest(".key");
      if (!btn) return;
      this.handleKey(btn.dataset.key);
    });

    // Physical keyboard
    document.addEventListener("keydown", e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") this.handleKey("ENTER");
      else if (e.key === "Backspace") this.handleKey("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) this.handleKey(e.key.toUpperCase());
    });

    // Header buttons
    document.getElementById("btn-stats").addEventListener("click", () => this.showStats());
    document.getElementById("btn-rules").addEventListener("click", () => this.openModal(this.rulesModal));

    // Modal close buttons
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-close-modal");
        this.closeModal(document.getElementById(id));
      });
    });

    // Share
    document.getElementById("btn-share")?.addEventListener("click", () => this.shareResult());
    document.getElementById("btn-share-stats")?.addEventListener("click", () => this.shareResult());
  }

  handleKey(key) {
    if (this.game.status !== "playing") return;

    if (key === "ENTER") {
      const res = this.game.submitGuess();
      if (!res.ok) {
        this.showToast(t(res.error));
        this.shakeCurrentRow();
        return;
      }
      this.renderBoard();
      // Wait for flip animation before keyboard update + result modal
      setTimeout(() => {
        this.renderKeyboard();
        this.persistAndCheckEnd();
      }, WORD_LENGTH * 100 + 400);
    } else if (key === "BACK") {
      this.game.removeLetter();
      this.renderBoard();
    } else if (/^[A-Z]$/.test(key)) {
      this.game.addLetter(key);
      this.renderBoard();
    }
  }

  persistAndCheckEnd() {
    saveLastGame({
      date: getTodayString(),
      guesses: this.game.guesses,
      status: this.game.status,
      target: this.game.target,
      dayNumber: this.game.dayNumber
    });

    if (this.game.status === "won" || this.game.status === "lost") {
      recordGame({
        won: this.game.status === "won",
        attempts: this.game.guesses.length,
        dateString: getTodayString()
      });
      setTimeout(() => this.showResult(this.game.status === "won"), 500);
    }
  }

  showResult(won) {
    const titleEl = document.getElementById("result-title");
    const subtitleEl = document.getElementById("result-subtitle");
    const wordEl = document.getElementById("result-word");
    const categoryEl = document.getElementById("result-category");
    const definitionEl = document.getElementById("result-definition");
    const countdownEl = document.getElementById("result-countdown");

    titleEl.textContent = won ? t("win") : t("lose");
    titleEl.className = won ? "result-title win" : "result-title lose";

    if (won) {
      const n = this.game.guesses.length;
      subtitleEl.textContent = `${t("youFound")} ${n} ${n === 1 ? t("attempt") : t("attempts")}.`;
    } else {
      subtitleEl.textContent = t("theWordWas");
    }

    wordEl.textContent = this.game.target;
    categoryEl.textContent = this.game.category;
    definitionEl.textContent = this.game.definition;

    this.startCountdown(countdownEl);
    this.openModal(this.resultModal);
  }

  showStats() {
    const stats = loadStats();
    document.getElementById("stat-played").textContent = stats.played;
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById("stat-winrate").textContent = winRate;
    document.getElementById("stat-current").textContent = stats.currentStreak;
    document.getElementById("stat-max").textContent = stats.maxStreak;

    // Distribution
    const distEl = document.getElementById("stat-distribution");
    distEl.innerHTML = "";
    const max = Math.max(1, ...stats.distribution);
    stats.distribution.forEach((count, i) => {
      const row = document.createElement("div");
      row.className = "dist-row";
      const label = document.createElement("span");
      label.className = "dist-label";
      label.textContent = i + 1;
      const bar = document.createElement("div");
      bar.className = "dist-bar";
      bar.style.width = `${(count / max) * 100}%`;
      const value = document.createElement("span");
      value.className = "dist-value";
      value.textContent = count;
      bar.appendChild(value);
      row.appendChild(label);
      row.appendChild(bar);
      distEl.appendChild(row);
    });

    this.openModal(this.statsModal);
  }

  shareResult() {
    const text = buildShareText({
      dayNumber: this.game.dayNumber,
      attempts: this.game.guesses.length,
      won: this.game.status === "won",
      results: this.game.guesses.map(g => g.result)
    });
    share(text, msg => this.showToast(msg));
  }

  startCountdown(el) {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${t("nextPuzzle")} ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    };
    update();
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    this._countdownTimer = setInterval(update, 1000);
  }

  shakeCurrentRow() {
    const rows = this.boardEl.querySelectorAll(".row");
    const idx = Math.min(this.game.guesses.length, rows.length - 1);
    const row = rows[idx];
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth;
    row.classList.add("shake");
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove("visible");
    }, 1800);
  }

  openModal(modal) {
    modal.classList.add("visible");
  }

  closeModal(modal) {
    modal.classList.remove("visible");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
