/**
 * FinMot — Partage social
 * Génère une grille emoji + utilise Web Share API ou copie presse-papiers
 */

import { t } from "./i18n.js";

/**
 * Génère la grille emoji à partir des résultats des essais.
 * @param {Array<Array<string>>} results - tableau de tableaux de "correct"|"present"|"absent"
 */
export function buildEmojiGrid(results) {
  return results.map(row =>
    row.map(state => {
      switch (state) {
        case "correct": return "🟩";
        case "present": return "🟨";
        case "absent": return "⬛";
        default: return "⬜";
      }
    }).join("")
  ).join("\n");
}

export function buildShareText({ dayNumber, attempts, won, results }) {
  const score = won ? `${attempts}/6` : "X/6";
  const header = `FinMot #${dayNumber} ${score}`;
  const grid = buildEmojiGrid(results);
  const url = "\nhttps://play.google.com/store/apps/details?id=app.smartlife.finmot";
  return `${header}\n\n${grid}${url}`;
}

export async function share(text, toastCallback) {
  // Try native share first
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch (e) {
      if (e?.name === "AbortError") return false;
      // Fall through to clipboard
    }
  }
  // Fallback : clipboard
  try {
    await navigator.clipboard.writeText(text);
    toastCallback?.(t("shareCopied"));
    return true;
  } catch {
    // Last resort : create textarea + execCommand
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toastCallback?.(t("shareCopied"));
    } catch {}
    document.body.removeChild(ta);
    return true;
  }
}
