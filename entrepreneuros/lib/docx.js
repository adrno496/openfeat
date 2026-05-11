// lib/docx.js — Export Word (.docx)
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

const { dataFile } = require('./paths');
const OUTPUT_DIR = dataFile('outputs');

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function lineToParagraph(line) {
  if (/^#\s/.test(line))     return new Paragraph({ text: line.replace(/^#\s/, ''), heading: HeadingLevel.HEADING_1 });
  if (/^##\s/.test(line))    return new Paragraph({ text: line.replace(/^##\s/, ''), heading: HeadingLevel.HEADING_2 });
  if (/^###\s/.test(line))   return new Paragraph({ text: line.replace(/^###\s/, ''), heading: HeadingLevel.HEADING_3 });
  if (/^[-*]\s/.test(line))  return new Paragraph({ text: line.replace(/^[-*]\s/, ''), bullet: { level: 0 } });
  // Inline bold avec **...**
  const runs = [];
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (/^\*\*[^*]+\*\*$/.test(p)) runs.push(new TextRun({ text: p.slice(2, -2), bold: true }));
    else runs.push(new TextRun(p));
  }
  return new Paragraph({ children: runs.length ? runs : [new TextRun(line)] });
}

async function generateDocx(content, filename) {
  ensureDir();
  const lines = String(content).split('\n');
  const paragraphs = lines.map(lineToParagraph);
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);
  const safe = (filename || 'document').replace(/[^a-z0-9_-]+/gi, '_');
  const outPath = path.join(OUTPUT_DIR, `${safe}_${Date.now()}.docx`);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

module.exports = { generateDocx, generateDOCX: generateDocx };
