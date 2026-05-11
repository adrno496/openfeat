// lib/storage.js — Persistance JSON par module
const fs = require('fs');
const path = require('path');

const { dataDir } = require('./paths');
const DATA_ROOT = dataDir();

function dirFor(moduleId) {
  const d = path.join(DATA_ROOT, moduleId);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function newId(moduleId) {
  return `${moduleId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function save(moduleId, data) {
  const dir = dirFor(moduleId);
  const id = data.id || newId(moduleId);
  const record = { id, ...data, createdAt: data.createdAt || new Date().toISOString() };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(record, null, 2), 'utf8');
  return record;
}

function get(moduleId, id) {
  const file = path.join(dirFor(moduleId), `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function list(moduleId) {
  const dir = dirFor(moduleId);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const items = files.map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch { return null; }
  }).filter(Boolean);
  items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

function remove(moduleId, id) {
  const file = path.join(dirFor(moduleId), `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function listAllRecent(limit = 6) {
  if (!fs.existsSync(DATA_ROOT)) return [];
  const moduleDirs = fs.readdirSync(DATA_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !['outputs', 'templates'].includes(d.name))
    .map((d) => d.name);
  const all = [];
  for (const m of moduleDirs) {
    for (const item of list(m)) all.push({ module: m, ...item });
  }
  all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return all.slice(0, limit);
}

module.exports = { save, get, list, remove, listAllRecent };
