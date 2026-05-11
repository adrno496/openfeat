// main.js — Electron main process
require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

const ctx        = require('./lib/context');
const keys       = require('./lib/keys');
const cm         = require('./lib/connection-manager');
const llm        = require('./lib/llm');
const llmWebview = require('./lib/llm-webview');
const pdfLib     = require('./lib/pdf');
const docxLib    = require('./lib/docx');
const storage    = require('./lib/storage');
const { WebViewBridge } = require('./lib/webview-bridge');

const MODULES = {
  'business-plan': require('./modules/business-plan'),
  'invoice':       require('./modules/invoice'),
  'proposal':      require('./modules/proposal'),
  'email-campaign':require('./modules/email-campaign'),
  'legal':         require('./modules/legal-docs'),
  'forecast':      require('./modules/financial-forecast'),
  'cold-email':    require('./modules/cold-email'),
  'meeting':       require('./modules/meeting-summary'),
  'gtm':           require('./modules/gtm-plan'),
  'sop':           require('./modules/sop-generator'),
  'pdf-analyzer':  require('./modules/pdf-analyzer'),
  'pdf-compare':   require('./modules/pdf-compare'),
  'social-post':       require('./modules/social-post'),
  'content-plan':      require('./modules/content-plan'),
  'social-audit':      require('./modules/social-audit'),
  'newsletter':        require('./modules/newsletter'),
  'research-watch':    require('./modules/research-watch'),
  'canva-brief':       require('./modules/canva-brief'),
  'file-organization': require('./modules/file-organization'),
  'drive-organization':require('./modules/drive-organization'),
  'folder-analyzer':   require('./modules/folder-analyzer')
};

let mainWindow = null;
let webviewBridge = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#080807',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin' ? false : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Initialise le bridge WebView (Mode 2)
  webviewBridge = new WebViewBridge(mainWindow);
  llmWebview.setBridge(webviewBridge);
}

app.whenReady().then(() => {
  // Sécurise CSP par défaut
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: { ...details.responseHeaders } });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------- IPC ----------------

function safe(handler) {
  return async (...args) => {
    try { return await handler(...args); }
    catch (e) { return { __error: e.message || String(e) }; }
  };
}

// IA — génération (avec streaming optionnel via streamId + pièces jointes universelles)
ipcMain.handle('eos:generate', safe(async (event, moduleId, input, options = {}) => {
  const mod = MODULES[moduleId];
  if (!mod) throw new Error(`Module inconnu : ${moduleId}`);
  const opts = { ...options, module: moduleId };
  if (options.streamId) {
    opts.onChunk = (delta, full) => {
      try { event.sender.send('eos:stream', options.streamId, { delta, full }); } catch (e) {}
    };
    delete opts.streamId;
  }
  // Pièces jointes universelles (fichiers + dossiers) — lues et injectées dans le user prompt via llm.js
  const cleanInput = { ...(input || {}) };
  const attachments = cleanInput.__attachments || [];
  delete cleanInput.__attachments;
  if (attachments && attachments.length) {
    try {
      const att = require('./lib/attachments');
      const ctxText = await att.buildContext(attachments);
      if (ctxText) opts.attachmentsContext = ctxText;
    } catch (e) { console.error('[attachments] erreur lecture :', e.message); }
  }
  return await mod.generate(cleanInput, opts);
}));

// IA — affinage d'un document existant (streaming via streamId)
ipcMain.handle('eos:refine', safe(async (event, moduleId, docId, instruction, options = {}) => {
  if (!instruction || !instruction.trim()) throw new Error('Instruction vide');
  const doc = storage.get(moduleId, docId);
  if (!doc) throw new Error('Document introuvable');
  const opts = { tier: options.tier || 'sonnet' };
  if (options.streamId) {
    opts.onChunk = (delta, full) => {
      try { event.sender.send('eos:stream', options.streamId, { delta, full }); } catch (e) {}
    };
  }
  const newContent = await llm.refine(doc.content || '', instruction, opts);
  const history = Array.isArray(doc.history) ? doc.history.slice() : [];
  history.push({ at: new Date().toISOString(), instruction, previousContent: doc.content });
  return storage.save(moduleId, { ...doc, content: newContent, history });
}));

ipcMain.handle('eos:listDocs', safe(async (_e, moduleId) => {
  const mod = MODULES[moduleId];
  if (!mod) return [];
  return mod.list();
}));

ipcMain.handle('eos:listAllRecent', safe(async (_e, limit) => storage.listAllRecent(limit || 6)));

// Profil
ipcMain.handle('eos:saveProfile', safe(async (_e, data) => ctx.saveProfile(data || {})));
ipcMain.handle('eos:getProfile',  safe(async () => ctx.getProfile()));

// Connexion / mode IA
ipcMain.handle('eos:getConnectionConfig', safe(async () => cm.getConfig()));
ipcMain.handle('eos:setConnectionMode',   safe(async (_e, mode) => cm.setMode(mode)));
ipcMain.handle('eos:updateConnectionConfig', safe(async (_e, patch) => cm.updateConfig(patch || {})));
ipcMain.handle('eos:testConnection',      safe(async (_e, mode) => llm.testConnection(mode)));

// WebView login
ipcMain.handle('eos:webviewShowLogin', safe(async () => {
  const cfg = cm.getConfig();
  await webviewBridge.ensureProvider(cfg.webviewProvider || 'claude');
  return await webviewBridge.showLogin();
}));
ipcMain.handle('eos:webviewHideLogin', safe(async () => webviewBridge.hideLogin()));
ipcMain.handle('eos:webviewIsLoggedIn', safe(async () => {
  const cfg = cm.getConfig();
  await webviewBridge.ensureProvider(cfg.webviewProvider || 'claude');
  return await webviewBridge.isLoggedIn();
}));

// Clés
ipcMain.handle('eos:keysList',   safe(async () => keys.listKeys()));
ipcMain.handle('eos:keysSet',    safe(async (_e, name, value) => { keys.setKey(name, value); return { ok: true }; }));
ipcMain.handle('eos:keysGet',    safe(async (_e, name) => keys.getKey(name)));
ipcMain.handle('eos:keysDelete', safe(async (_e, name) => { keys.deleteKey(name); return { ok: true }; }));
ipcMain.handle('eos:keysTest',   safe(async (_e, name, value) => keys.validateKey(name, value)));

// Exports
ipcMain.handle('eos:exportPDF', safe(async (_e, content, filename) => {
  return await pdfLib.generatePDF(content, filename || 'document');
}));

ipcMain.handle('eos:exportDOCX', safe(async (_e, content, filename) => {
  return await docxLib.generateDOCX(content, filename || 'document');
}));

ipcMain.handle('eos:exportICS', safe(async (_e, moduleId, docId) => {
  const doc = storage.get(moduleId, docId);
  if (!doc || !doc.ics) throw new Error('Aucun calendrier disponible pour ce document');
  const path = require('path');
  const fs = require('fs');
  const { dataFile } = require('./lib/paths');
  const dir = dataFile('outputs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${moduleId}_${docId}.ics`);
  fs.writeFileSync(out, doc.ics, 'utf8');
  return out;
}));

ipcMain.handle('eos:exportCSV', safe(async (_e, moduleId, docId) => {
  const doc = storage.get(moduleId, docId);
  if (!doc) throw new Error('Document introuvable');
  // Pour invoice : génère un CSV des lignes
  const path = require('path');
  const fs = require('fs');
  const { dataFile } = require('./lib/paths');
  const dir = dataFile('outputs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let csv = '';
  if (moduleId === 'invoice' && doc.input && doc.input.lines) {
    const inv = require('./modules/invoice');
    const lines = inv.parseLines(doc.input.lines);
    csv = 'Description;Quantité;PU HT;TVA%;Total HT\n';
    for (const l of lines) csv += `"${(l.description||'').replace(/"/g,'""')}";${l.qty};${l.unitPrice};${l.vatRate};${(l.qty*l.unitPrice).toFixed(2)}\n`;
  } else {
    // Fallback générique : exporter le markdown brut
    csv = (doc.content || '').replace(/\r/g, '');
  }
  const out = path.join(dir, `${moduleId}_${docId}.csv`);
  fs.writeFileSync(out, csv, 'utf8');
  return out;
}));

ipcMain.handle('eos:openFileDialog', safe(async () => {
  return await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
}));

ipcMain.handle('eos:pickFolder', safe(async (_e, opts = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: opts.title || 'Choisir un dossier',
    properties: ['openDirectory']
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return { canceled: false, folderPath: r.filePaths[0] };
}));

ipcMain.handle('eos:scanWorkspace', safe(async (_e, folderPath, force) => {
  const ws = require('./lib/workspace');
  const target = folderPath || (ctx.getProfile() || {}).workspacePath;
  if (!target) return { ok: false, error: 'Aucun dossier de travail défini' };
  if (force) ws.invalidateCache(target);
  const summary = ws.summarize(ws.scan(target));
  return { ok: true, summary };
}));

ipcMain.handle('eos:pickLogo', safe(async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir le logo de l\'entreprise',
    properties: ['openFile'],
    filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }]
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return { canceled: false, filePath: r.filePaths[0] };
}));

ipcMain.handle('eos:sendEmail', safe(async (_e, payload) => {
  const mailer = require('./lib/mailer');
  return await mailer.sendEmail(payload || {});
}));

ipcMain.handle('eos:pickAudio', safe(async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir un enregistrement audio',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'wav', 'webm', 'mp4', 'mpga', 'mpeg'] }]
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return { canceled: false, filePath: r.filePaths[0] };
}));

ipcMain.handle('eos:transcribeAudio', safe(async (_e, filePath) => {
  const fs = require('fs');
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Fichier audio introuvable');
  const apiKey = keys.getKey('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Transcription audio nécessite OPENAI_API_KEY (Whisper). Configurez-la dans Paramètres → Clés API.');
  const OpenAI = require('openai').default || require('openai');
  const client = new OpenAI({ apiKey });
  const stat = fs.statSync(filePath);
  if (stat.size > 25 * 1024 * 1024) throw new Error('Fichier trop volumineux pour Whisper (max 25 MB). Coupe-le ou compresse-le.');
  const resp = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'text'
  });
  return { ok: true, text: typeof resp === 'string' ? resp : (resp.text || '') };
}));

ipcMain.handle('eos:previewAttachments', safe(async (_e, attachments) => {
  const att = require('./lib/attachments');
  const text = await att.buildContext(attachments || []);
  return { text, length: text.length };
}));

ipcMain.handle('eos:pickFiles', safe(async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir des fichiers à joindre',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'md', 'markdown', 'txt', 'csv', 'json', 'yml', 'yaml', 'tsv', 'log', 'docx'] },
      { name: 'Tous', extensions: ['*'] }
    ]
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return { canceled: false, filePaths: r.filePaths };
}));

ipcMain.handle('eos:pickPdf', safe(async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir un PDF à analyser',
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  return { canceled: false, filePath: r.filePaths[0] };
}));

ipcMain.handle('eos:getUsage', safe(async () => {
  return require('./lib/usage').getStats();
}));

ipcMain.handle('eos:resetUsage', safe(async () => {
  require('./lib/usage').reset();
  return { ok: true };
}));

ipcMain.handle('eos:resetAll', safe(async (_e, options = {}) => {
  const { dataDir } = require('./lib/paths');
  const root = dataDir();
  if (!fs.existsSync(root)) return { ok: true, removed: 0 };
  let removed = 0;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(root, ent.name);
    if (options.keepProfile && ent.name === 'company-profile.json') continue;
    if (options.keepKeys && ent.name === 'keys.enc') continue;
    if (options.keepConfig && ent.name === 'connection-config.json') continue;
    try {
      if (ent.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
      else fs.unlinkSync(full);
      removed++;
    } catch (e) { console.error('reset error :', e.message); }
  }
  return { ok: true, removed };
}));

ipcMain.handle('eos:exportAll', safe(async () => {
  const { dataDir } = require('./lib/paths');
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter toutes les données',
    defaultPath: `entrepreneuros-backup-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePath) return { canceled: true };
  const root = dataDir();
  const dump = { exportedAt: new Date().toISOString(), files: {} };
  const walk = (dir, base = '') => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${ent.name}` : ent.name;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full, rel);
      else {
        try { dump.files[rel] = fs.readFileSync(full, 'utf8'); }
        catch { /* binaire ou trop gros — skip */ }
      }
    }
  };
  walk(root);
  fs.writeFileSync(r.filePath, JSON.stringify(dump, null, 2), 'utf8');
  return { ok: true, path: r.filePath, count: Object.keys(dump.files).length };
}));

ipcMain.handle('eos:importAll', safe(async () => {
  const { dataDir } = require('./lib/paths');
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer une sauvegarde',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (r.canceled || !r.filePaths.length) return { canceled: true };
  const raw = fs.readFileSync(r.filePaths[0], 'utf8');
  const dump = JSON.parse(raw);
  if (!dump || !dump.files) throw new Error('Fichier de sauvegarde invalide');
  const root = dataDir();
  let restored = 0;
  for (const [rel, content] of Object.entries(dump.files)) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content, 'utf8');
    restored++;
  }
  return { ok: true, count: restored };
}));

ipcMain.handle('eos:openDataFolder', safe(async () => {
  const { dataDir } = require('./lib/paths');
  require('electron').shell.openPath(dataDir());
  return { ok: true };
}));

ipcMain.handle('eos:revealInFolder', safe(async (_e, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    require('electron').shell.showItemInFolder(filePath);
    return { ok: true };
  }
  return { ok: false };
}));
