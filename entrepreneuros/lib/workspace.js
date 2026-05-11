// lib/workspace.js — Scan et synthèse d'un dossier de projet utilisateur
const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '.DS_Store', 'venv', '.venv',
  '__pycache__', '.next', '.nuxt', 'dist', 'build', 'out', '.cache',
  '.vscode', '.idea', '.gradle', 'target', 'bin', 'obj',
  'Library', 'Applications' // Sécurité : éviter root macOS
]);

const TYPE_GROUPS = {
  document:    ['.pdf', '.doc', '.docx', '.odt', '.rtf'],
  spreadsheet: ['.xls', '.xlsx', '.csv', '.ods', '.numbers'],
  presentation:['.ppt', '.pptx', '.keynote', '.key'],
  text:        ['.txt', '.md', '.markdown'],
  image:       ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic', '.bmp'],
  video:       ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  audio:       ['.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg'],
  archive:     ['.zip', '.rar', '.7z', '.tar', '.gz'],
  code:        ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.html', '.css', '.json', '.yml', '.yaml', '.sql'],
  design:      ['.fig', '.sketch', '.psd', '.ai', '.xd', '.afdesign']
};

const TYPE_OF = (() => {
  const m = {};
  for (const [grp, exts] of Object.entries(TYPE_GROUPS)) for (const e of exts) m[e] = grp;
  return m;
})();

const KEYWORDS = {
  contrat:    /contrat|contract|nda|cdd|cdi|prestation|signature/i,
  facture:    /facture|invoice|honoraires|devis|quote|estimate/i,
  juridique:  /cgv|cgu|mentions|privacy|rgpd|gdpr|legal|statut|kbis/i,
  finance:    /budget|forecast|previsionnel|compta|comptable|p\W*l|cash|bilan/i,
  marketing:  /campagne|plan.?marketing|brand|logo|identite|identity|charte|persona/i,
  client:     /client|customer|prospect|deal|opportunit/i,
  livrable:   /livrable|deliverable|presentation|deck|rapport|report|audit/i
};

const MAX_FILES = 5000;
const MAX_DEPTH = 8;

function classify(filename) {
  const ext = path.extname(filename).toLowerCase();
  const type = TYPE_OF[ext] || 'autre';
  const tags = [];
  for (const [tag, rx] of Object.entries(KEYWORDS)) if (rx.test(filename)) tags.push(tag);
  return { type, tags, ext };
}

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function walk(rootPath, maxFiles = MAX_FILES) {
  const result = {
    rootPath,
    rootName: path.basename(rootPath),
    files: [],
    truncated: false,
    totalSize: 0
  };
  if (!rootPath || !fs.existsSync(rootPath)) {
    result.error = 'Dossier introuvable';
    return result;
  }

  const stack = [{ dir: rootPath, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > MAX_DEPTH) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }

    for (const ent of entries) {
      if (result.files.length >= maxFiles) { result.truncated = true; return result; }
      if (ent.name.startsWith('.')) continue;
      if (IGNORED_DIRS.has(ent.name)) continue;

      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else if (ent.isFile()) {
        const st = safeStat(full);
        if (!st) continue;
        const rel = path.relative(rootPath, full);
        const cls = classify(ent.name);
        result.files.push({
          name: ent.name,
          relPath: rel,
          fullPath: full,
          size: st.size,
          mtime: st.mtimeMs,
          ...cls
        });
        result.totalSize += st.size;
      }
    }
  }
  return result;
}

function summarize(scan) {
  if (scan.error) return scan;
  const byType = {};
  const byTag = {};
  const byExt = {};
  let recent = [];

  for (const f of scan.files) {
    byType[f.type] = (byType[f.type] || 0) + 1;
    byExt[f.ext || '(sans ext)'] = (byExt[f.ext || '(sans ext)'] || 0) + 1;
    for (const t of f.tags) byTag[t] = (byTag[t] || 0) + 1;
    recent.push(f);
  }
  recent.sort((a, b) => b.mtime - a.mtime);
  recent = recent.slice(0, 20).map((f) => ({ name: f.name, relPath: f.relPath, mtime: f.mtime, size: f.size, type: f.type, tags: f.tags }));

  // Top dossiers de premier niveau (avec compte fichiers)
  const topDirs = {};
  for (const f of scan.files) {
    const first = f.relPath.split(path.sep)[0];
    if (!first || first === f.name) continue;
    topDirs[first] = (topDirs[first] || 0) + 1;
  }
  const topDirsArr = Object.entries(topDirs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));

  return {
    rootPath: scan.rootPath,
    rootName: scan.rootName,
    totalFiles: scan.files.length,
    totalSize: scan.totalSize,
    truncated: scan.truncated,
    byType,
    byTag,
    byExt,
    topDirs: topDirsArr,
    recent
  };
}

// Cache en mémoire : évite de re-scanner un gros dossier à chaque appel
const _cache = new Map();
const CACHE_TTL = 60_000; // 60s

function scan(rootPath, opts = {}) {
  if (!opts.force) {
    const hit = _cache.get(rootPath);
    if (hit && (Date.now() - hit.at < CACHE_TTL)) return hit.data;
  }
  const raw = walk(rootPath);
  const data = { ...summarize(raw), files: raw.files };
  _cache.set(rootPath, { at: Date.now(), data });
  return data;
}

function invalidateCache(rootPath) {
  if (rootPath) _cache.delete(rootPath);
  else _cache.clear();
}

// Texte court à injecter dans les prompts pour donner du contexte au LLM
function getContextSnippet(rootPath, options = {}) {
  const max = options.maxLength || 1500;
  if (!rootPath || !fs.existsSync(rootPath)) return '';
  // Utilise le cache : pas de re-scan si <60s
  const s = scan(rootPath);
  if (!s || s.error) return '';
  const lines = [];
  lines.push(`Dossier de travail de l'utilisateur : "${s.rootName}" (${s.totalFiles} fichiers, ${formatSize(s.totalSize)})`);
  if (s.topDirs.length) lines.push('Sous-dossiers principaux : ' + s.topDirs.map((d) => `${d.name} (${d.count})`).join(', '));
  const tagsLine = Object.entries(s.byTag).map(([t, n]) => `${t}: ${n}`).join(', ');
  if (tagsLine) lines.push('Catégories détectées : ' + tagsLine);
  const recentNames = s.recent.slice(0, 8).map((f) => f.name).join(', ');
  if (recentNames) lines.push('Fichiers récents : ' + recentNames);
  let txt = lines.join('\n');
  if (txt.length > max) txt = txt.slice(0, max) + '…';
  return txt;
}

function formatSize(bytes) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

module.exports = { scan, summarize, getContextSnippet, formatSize, classify, invalidateCache };
