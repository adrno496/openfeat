// lib/workspace-read.js — Lit le contenu de fichiers clés d'un workspace
const fs = require('fs');
const path = require('path');
const ws = require('./workspace');

const READABLE_EXTS = new Set(['.md', '.markdown', '.txt', '.csv', '.json', '.yml', '.yaml']);
const PDF_EXTS = new Set(['.pdf']);
const DOCX_EXTS = new Set(['.docx']);

const PRIORITY_KEYWORDS = [
  /readme/i, /plan/i, /strategy|strat[ée]gie/i, /roadmap/i,
  /brief/i, /vision/i, /mission/i, /objectif|goal/i, /budget/i,
  /forecast|previsionnel/i, /persona/i, /pitch/i, /charte/i, /guidelines/i
];

function priorityScore(file) {
  let score = 0;
  for (const rx of PRIORITY_KEYWORDS) if (rx.test(file.name)) score += 10;
  if (file.tags && file.tags.length) score += 5 * file.tags.length;
  if (file.type === 'text') score += 3;
  if (file.type === 'document') score += 2;
  // Prioriser fichiers récents
  const ageDays = (Date.now() - file.mtime) / 86400000;
  if (ageDays < 7) score += 5;
  else if (ageDays < 30) score += 3;
  // Préférer racine et 1er niveau
  const depth = file.relPath.split(path.sep).length;
  if (depth <= 2) score += 3;
  return score;
}

async function readFileExcerpt(filepath, maxChars) {
  const ext = path.extname(filepath).toLowerCase();
  try {
    if (READABLE_EXTS.has(ext)) {
      const raw = fs.readFileSync(filepath, 'utf8');
      return raw.slice(0, maxChars);
    }
    if (PDF_EXTS.has(ext)) {
      const { extractText } = require('./pdf-extract');
      const r = await extractText(filepath);
      return (r.text || '').slice(0, maxChars);
    }
    if (DOCX_EXTS.has(ext)) {
      const mammoth = require('mammoth');
      const r = await mammoth.extractRawText({ path: filepath });
      return (r.value || '').slice(0, maxChars);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Sélectionne et lit les N fichiers les plus pertinents du workspace
async function readKeyFiles(folderPath, options = {}) {
  const maxFiles = options.maxFiles || 10;
  const charsPerFile = options.charsPerFile || 3000;
  const totalBudget = options.totalBudget || 25000;

  const scan = ws.scan(folderPath);
  if (!scan || !scan.recent) return { files: [], summary: scan };

  // Tri par pertinence
  const allFiles = (scan.files || []).slice();
  // Note : `scan.files` contient l'array brut depuis walk()
  const candidates = allFiles
    .map((f) => ({ ...f, score: priorityScore(f) }))
    .filter((f) => READABLE_EXTS.has(f.ext) || PDF_EXTS.has(f.ext) || DOCX_EXTS.has(f.ext))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  const out = [];
  let budget = totalBudget;
  for (const c of candidates) {
    if (budget <= 200) break;
    const cap = Math.min(charsPerFile, budget);
    const text = await readFileExcerpt(c.fullPath, cap);
    if (text && text.trim()) {
      out.push({
        name: c.name,
        relPath: c.relPath,
        type: c.type,
        ext: c.ext,
        score: c.score,
        excerpt: text,
        truncated: text.length >= cap
      });
      budget -= text.length;
    }
  }

  return {
    files: out,
    summary: ws.summarize(scan)
  };
}

module.exports = { readKeyFiles };
