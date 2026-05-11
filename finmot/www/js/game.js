/**
 * FinMot — Logique de jeu
 */

import { getDailyWord, isValidGuess } from "./words.js";

export const MAX_ATTEMPTS = 6;
export const WORD_LENGTH = 5;

/**
 * Évalue un essai par rapport au mot cible.
 * Retourne un tableau de "correct" | "present" | "absent"
 */
export function evaluateGuess(guess, target) {
  const result = new Array(WORD_LENGTH).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");
  const remaining = {};

  // Pass 1 : exact matches
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = "correct";
    } else {
      remaining[targetArr[i]] = (remaining[targetArr[i]] || 0) + 1;
    }
  }

  // Pass 2 : present (wrong place)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const letter = guessArr[i];
    if (remaining[letter] > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    }
  }

  return result;
}

/**
 * État du jeu en cours
 */
export class GameState {
  constructor() {
    const daily = getDailyWord();
    this.target = daily.word;
    this.category = daily.category;
    this.definition = daily.definition;
    this.dayNumber = daily.dayNumber;
    this.guesses = []; // chaque entrée = { word, result }
    this.currentInput = "";
    this.status = "playing"; // "playing" | "won" | "lost"
  }

  addLetter(letter) {
    if (this.status !== "playing") return false;
    if (this.currentInput.length >= WORD_LENGTH) return false;
    if (!/^[A-Z]$/.test(letter)) return false;
    this.currentInput += letter;
    return true;
  }

  removeLetter() {
    if (this.status !== "playing") return false;
    if (this.currentInput.length === 0) return false;
    this.currentInput = this.currentInput.slice(0, -1);
    return true;
  }

  /**
   * Tente de soumettre l'essai courant.
   * @returns {Object} { ok, error, evaluation, guess }
   */
  submitGuess() {
    if (this.status !== "playing") {
      return { ok: false, error: "alreadyPlayed" };
    }
    if (this.currentInput.length < WORD_LENGTH) {
      return { ok: false, error: "notEnoughLetters" };
    }
    const guess = this.currentInput.toUpperCase();
    if (!isValidGuess(guess)) {
      return { ok: false, error: "invalidWord" };
    }

    const evaluation = evaluateGuess(guess, this.target);
    this.guesses.push({ word: guess, result: evaluation });
    this.currentInput = "";

    if (guess === this.target) {
      this.status = "won";
    } else if (this.guesses.length >= MAX_ATTEMPTS) {
      this.status = "lost";
    }

    return { ok: true, evaluation, guess };
  }

  getKeyboardState() {
    // Pour chaque lettre du clavier, retourne le meilleur état observé
    const state = {};
    const priority = { correct: 3, present: 2, absent: 1 };

    for (const { word, result } of this.guesses) {
      for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const evalState = result[i];
        if (!state[letter] || priority[evalState] > priority[state[letter]]) {
          state[letter] = evalState;
        }
      }
    }
    return state;
  }
}
