// lib/pdf-extract.js — Extraction texte depuis un PDF local
const fs = require('fs');
const path = require('path');

async function extractText(filepath) {
  if (!filepath || !fs.existsSync(filepath)) {
    throw new Error('Fichier PDF introuvable : ' + filepath);
  }
  const buf = fs.readFileSync(filepath);
  const pdf = require('pdf-parse');
  const data = await pdf(buf);
  return {
    fileName: path.basename(filepath),
    filePath: filepath,
    numPages: data.numpages,
    text: (data.text || '').trim(),
    info: data.info || {}
  };
}

module.exports = { extractText };
