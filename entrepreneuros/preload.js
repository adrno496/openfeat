// preload.js — Bridge IPC sécurisé exposé sous window.eos
const { contextBridge, ipcRenderer } = require('electron');

function call(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).then((r) => {
    if (r && typeof r === 'object' && r.__error) throw new Error(r.__error);
    return r;
  });
}

let streamCounter = 0;
function newStreamId() { return `s${Date.now()}_${++streamCounter}`; }

// Génération avec streaming. onChunk(deltaText, fullText) appelé pour chaque token.
function generateStreaming(moduleId, input, options, onChunk) {
  const streamId = newStreamId();
  const listener = (_e, id, payload) => {
    if (id === streamId && onChunk) onChunk(payload.delta, payload.full);
  };
  ipcRenderer.on('eos:stream', listener);
  return call('eos:generate', moduleId, input, { ...(options || {}), streamId })
    .finally(() => ipcRenderer.removeListener('eos:stream', listener));
}

function refineStreaming(moduleId, docId, instruction, options, onChunk) {
  const streamId = newStreamId();
  const listener = (_e, id, payload) => {
    if (id === streamId && onChunk) onChunk(payload.delta, payload.full);
  };
  ipcRenderer.on('eos:stream', listener);
  return call('eos:refine', moduleId, docId, instruction, { ...(options || {}), streamId })
    .finally(() => ipcRenderer.removeListener('eos:stream', listener));
}

contextBridge.exposeInMainWorld('eos', {
  // IA
  generate:   (module, input, options) => call('eos:generate', module, input, options),
  generateStream: generateStreaming,
  refine:     (module, docId, instruction, options) => call('eos:refine', module, docId, instruction, options),
  refineStream: refineStreaming,
  listDocs:   (module) => call('eos:listDocs', module),
  listAllRecent: (limit) => call('eos:listAllRecent', limit),

  // Profil
  saveProfile: (data) => call('eos:saveProfile', data),
  getProfile:  () => call('eos:getProfile'),

  // Connexion
  getConnectionConfig:    () => call('eos:getConnectionConfig'),
  setConnectionMode:      (mode) => call('eos:setConnectionMode', mode),
  updateConnectionConfig: (patch) => call('eos:updateConnectionConfig', patch),
  testConnection:         (mode) => call('eos:testConnection', mode),

  // WebView
  webviewShowLogin:  () => call('eos:webviewShowLogin'),
  webviewHideLogin:  () => call('eos:webviewHideLogin'),
  webviewIsLoggedIn: () => call('eos:webviewIsLoggedIn'),

  // Clés
  keysList:   () => call('eos:keysList'),
  keysSet:    (name, value) => call('eos:keysSet', name, value),
  keysGet:    (name) => call('eos:keysGet', name),
  keysDelete: (name) => call('eos:keysDelete', name),
  keysTest:   (name, value) => call('eos:keysTest', name, value),

  // Exports
  exportPDF:  (content, filename) => call('eos:exportPDF', content, filename),
  exportDOCX: (content, filename) => call('eos:exportDOCX', content, filename),
  exportICS:  (module, docId) => call('eos:exportICS', module, docId),
  exportCSV:  (module, docId) => call('eos:exportCSV', module, docId),
  openFileDialog: () => call('eos:openFileDialog'),
  pickPdf:    () => call('eos:pickPdf'),
  pickFiles:  () => call('eos:pickFiles'),
  previewAttachments: (atts) => call('eos:previewAttachments', atts),
  pickAudio:  () => call('eos:pickAudio'),
  transcribeAudio: (filePath) => call('eos:transcribeAudio', filePath),
  pickLogo:   () => call('eos:pickLogo'),
  pickFolder: (opts) => call('eos:pickFolder', opts),
  scanWorkspace: (folderPath, force) => call('eos:scanWorkspace', folderPath, force),
  sendEmail:  (payload) => call('eos:sendEmail', payload),
  revealInFolder: (filePath) => call('eos:revealInFolder', filePath),
  getUsage:   () => call('eos:getUsage'),
  resetUsage: () => call('eos:resetUsage'),
  resetAll:   (opts) => call('eos:resetAll', opts),
  exportAll:  () => call('eos:exportAll'),
  importAll:  () => call('eos:importAll'),
  openDataFolder: () => call('eos:openDataFolder')
});
