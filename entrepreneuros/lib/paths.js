// lib/paths.js — résout le dossier de données utilisateur (writable en .dmg/.exe)
const path = require('path');
const fs = require('fs');

let cached = null;

function dataDir() {
  if (cached) return cached;
  let base;
  try {
    const electron = require('electron');
    const a = electron.app || (electron.remote && electron.remote.app);
    if (a && a.getPath) base = path.join(a.getPath('userData'), 'data');
  } catch (e) { /* hors Electron (CLI) */ }
  if (!base) base = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  cached = base;
  return base;
}

function dataFile(name) {
  return path.join(dataDir(), name);
}

module.exports = { dataDir, dataFile };
