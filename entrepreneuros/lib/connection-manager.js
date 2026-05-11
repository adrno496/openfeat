// lib/connection-manager.js — Gestion du mode IA actif et de sa configuration
const fs = require('fs');
const path = require('path');
const { dataFile } = require('./paths');

const CONFIG_FILE = dataFile('connection-config.json');

const DEFAULT_CONFIG = {
  mode: 'api',                       // 'api' | 'webview' | 'local'
  apiProvider: 'anthropic',          // 'anthropic' | 'openai'
  webviewProvider: 'claude',         // 'claude' | 'chatgpt'
  localUrl: 'http://localhost:11434',
  localModel: 'llama3',
  modelTier: 'sonnet'                // 'haiku' | 'sonnet' | 'opus'
};

function ensureDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.error('[connection-manager] lecture impossible :', e.message);
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}

function setMode(mode) {
  if (!['api', 'webview'].includes(mode)) {
    throw new Error(`Mode IA invalide : ${mode}`);
  }
  const cfg = getConfig();
  cfg.mode = mode;
  return saveConfig(cfg);
}

function updateConfig(patch) {
  const cfg = getConfig();
  const merged = { ...cfg, ...(patch || {}) };
  return saveConfig(merged);
}

function getMode() {
  return getConfig().mode;
}

module.exports = { getConfig, saveConfig, setMode, updateConfig, getMode, DEFAULT_CONFIG };
