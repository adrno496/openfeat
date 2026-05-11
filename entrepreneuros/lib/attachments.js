// lib/attachments.js — Lit le contenu d'un mix de fichiers + dossiers en pièce jointe
// pour injecter du contexte dans n'importe quel module.
const fs = require('fs');
const path = require('path');

const READABLE_EXTS = new Set(['.md', '.markdown', '.txt', '.csv', '.json', '.yml', '.yaml', '.tsv', '.log']);
const PDF_EXTS = new Set(['.pdf']);
const DOCX_EXTS = new Set(['.docx']);
const MAX_FILES = 12;
const MAX_CHARS_PER_FILE = 4000;
const TOTAL_BUDGET = 30000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function readSingleFile(filepath, charBudget) {
  if (!fs.existsSync(filepath)) return null;
  const stat = fs.statSync(filepath);
  if (stat.size > MAX_FILE_SIZE) return { name: path.basename(filepath), excerpt: null, error: 'fichier > 5 MB ignoré' };
  const ext = path.extname(filepath).toLowerCase();
  try {
    if (READABLE_EXTS.has(ext)) {
      const raw = fs.readFileSync(filepath, 'utf8');
      return { name: path.basename(filepath), path: filepath, ext, excerpt: raw.slice(0, charBudget), truncated: raw.length > charBudget };
    }
    if (PDF_EXTS.has(ext)) {
      const { extractText } = require('./pdf-extract');
      const r = await extractText(filepath);
      const text = (r.text || '').slice(0, charBudget);
      return { name: path.basename(filepath), path: filepath, ext, excerpt: text, truncated: (r.text || '').length > charBudget };
    }
    if (DOCX_EXTS.has(ext)) {
      const mammoth = require('mammoth');
      const r = await mammoth.extractRawText({ path: filepath });
      const text = (r.value || '').slice(0, charBudget);
      return { name: path.basename(filepath), path: filepath, ext, excerpt: text, truncated: (r.value || '').length > charBudget };
    }
    // Format non lisible : on indique juste le nom
    return { name: path.basename(filepath), path: filepath, ext, excerpt: null, error: 'type non lisible (binaire)' };
  } catch (e) {
    return { name: path.basename(filepath), path: filepath, error: e.message };
  }
}

async function readFolder(folderPath, charBudget) {
  if (!folderPath || !fs.existsSync(folderPath)) return [];
  const ws = require('./workspace-read');
  const r = await ws.readKeyFiles(folderPath, {
    maxFiles: 6,
    charsPerFile: Math.min(2500, Math.floor(charBudget / 4)),
    totalBudget: charBudget
  });
  return (r.files || []).map((f) => ({ name: f.name, path: f.fullPath, relPath: f.relPath, ext: f.ext, excerpt: f.excerpt, truncated: f.truncated, fromFolder: folderPath }));
}

// attachments : array d'objets { type: 'file'|'folder', path: '...' }
async function buildContext(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return '';
  const blocks = [];
  let budget = TOTAL_BUDGET;
  let count = 0;

  for (const att of attachments) {
    if (count >= MAX_FILES) break;
    if (budget <= 500) break;

    if (att.type === 'folder') {
      const items = await readFolder(att.path, Math.floor(budget * 0.6));
      for (const it of items) {
        if (count >= MAX_FILES) break;
        if (it.excerpt) {
          blocks.push(`### 📁 ${path.basename(att.path)} → ${it.relPath}\n\n${it.excerpt}${it.truncated ? '\n\n[…tronqué]' : ''}`);
          budget -= it.excerpt.length;
          count++;
        }
      }
    } else {
      const r = await readSingleFile(att.path, Math.min(MAX_CHARS_PER_FILE, budget));
      if (r) {
        if (r.excerpt) {
          blocks.push(`### 📎 ${r.name}\n\n${r.excerpt}${r.truncated ? '\n\n[…tronqué]' : ''}`);
          budget -= r.excerpt.length;
        } else if (r.error) {
          blocks.push(`### 📎 ${r.name} — _${r.error}_`);
        }
        count++;
      }
    }
  }

  if (!blocks.length) return '';
  return `\n\n---\n\n## Pièces jointes fournies par l'utilisateur\n\n${blocks.join('\n\n---\n\n')}`;
}

// Liste des metadata sans lire (pour l'UI)
function summarize(attachments) {
  return (attachments || []).map((att) => {
    if (att.type === 'folder') {
      try {
        const ws = require('./workspace');
        const s = ws.summarize(ws.scan(att.path));
        return { type: 'folder', path: att.path, name: path.basename(att.path), totalFiles: s.totalFiles, totalSize: s.totalSize };
      } catch { return { type: 'folder', path: att.path, name: path.basename(att.path) }; }
    }
    try {
      const stat = fs.statSync(att.path);
      return { type: 'file', path: att.path, name: path.basename(att.path), size: stat.size };
    } catch { return { type: 'file', path: att.path, name: path.basename(att.path), error: 'introuvable' }; }
  });
}

module.exports = { buildContext, summarize, readSingleFile, readFolder };
