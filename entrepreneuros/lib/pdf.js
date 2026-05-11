// lib/pdf.js — Génération PDF avec pdf-lib
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { getProfile } = require('./context');

const { dataFile } = require('./paths');
const OUTPUT_DIR = dataFile('outputs');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Découpe un texte en lignes selon une largeur max, en respectant les sauts existants.
function wrapText(text, font, fontSize, maxWidth) {
  const out = [];
  for (const paragraph of String(text).split('\n')) {
    if (!paragraph.trim()) { out.push(''); continue; }
    const words = paragraph.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        line = test;
      } else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

async function generatePDF(content, filename, options = {}) {
  ensureOutputDir();
  const profile = getProfile();
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28, PAGE_H = 841.89;
  const MARGIN = 50;
  const FONT_SIZE = 11;
  const LINE_H = 16;
  const HEADER_H = 80;
  const FOOTER_H = 30;
  const usableWidth = PAGE_W - MARGIN * 2;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Header
  page.drawText(profile.name || 'EntrepreneurOS', { x: MARGIN, y, size: 18, font: helvBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 18;
  if (profile.industry) {
    page.drawText(profile.industry, { x: MARGIN, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
  }
  if (options.title) {
    y -= 10;
    page.drawText(options.title, { x: MARGIN, y, size: 14, font: helvBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
  }
  // Ligne de séparation
  page.drawLine({
    start: { x: MARGIN, y: y - 4 },
    end:   { x: PAGE_W - MARGIN, y: y - 4 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8)
  });
  y -= 24;

  // Corps
  const lines = wrapText(content, helv, FONT_SIZE, usableWidth);
  for (const line of lines) {
    if (y < MARGIN + FOOTER_H) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    const isHeading = /^#{1,6}\s/.test(line);
    if (isHeading) {
      const level = (line.match(/^#+/) || ['#'])[0].length;
      const txt = line.replace(/^#+\s*/, '');
      const sz = Math.max(11, 16 - level);
      page.drawText(txt, { x: MARGIN, y, size: sz, font: helvBold, color: rgb(0.1, 0.1, 0.1) });
      y -= sz + 6;
    } else {
      page.drawText(line || ' ', { x: MARGIN, y, size: FONT_SIZE, font: helv, color: rgb(0.15, 0.15, 0.15) });
      y -= LINE_H;
    }
  }

  // Footer pages
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(`${profile.website || ''}`, { x: MARGIN, y: 20, size: 8, font: helv, color: rgb(0.6, 0.6, 0.6) });
    pg.drawText(`${i + 1} / ${pages.length}`, { x: PAGE_W - MARGIN - 30, y: 20, size: 8, font: helv, color: rgb(0.6, 0.6, 0.6) });
  });

  const safeName = (filename || 'document').replace(/[^a-z0-9_-]+/gi, '_');
  const outPath = path.join(OUTPUT_DIR, `${safeName}_${Date.now()}.pdf`);
  fs.writeFileSync(outPath, await pdf.save());
  return outPath;
}

async function generateInvoicePDF(invoiceData) {
  ensureOutputDir();
  const profile = getProfile();
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const M = 50;
  let y = height - M;

  // Bandeau émetteur
  page.drawText(profile.name || 'Mon entreprise', { x: M, y, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  page.drawText(profile.website || '', { x: M, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
  y -= 12;
  page.drawText(profile.country || '', { x: M, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  // Titre Facture
  page.drawText('FACTURE', { x: width - M - 100, y: height - M, size: 28, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`N° ${invoiceData.invoiceNumber || '0001'}`, { x: width - M - 100, y: height - M - 28, size: 11, font: helv });
  page.drawText(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { x: width - M - 100, y: height - M - 42, size: 10, font: helv, color: rgb(0.4,0.4,0.4) });

  // Bloc client
  page.drawText('Facturé à :', { x: M, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
  y -= 14;
  page.drawText(invoiceData.clientName || '', { x: M, y, size: 12, font: bold });
  y -= 14;
  for (const line of String(invoiceData.clientAddress || '').split('\n')) {
    page.drawText(line, { x: M, y, size: 10, font: helv });
    y -= 12;
  }
  if (invoiceData.clientEmail) {
    page.drawText(invoiceData.clientEmail, { x: M, y, size: 10, font: helv, color: rgb(0.4,0.4,0.4) });
    y -= 12;
  }
  y -= 30;

  // Tableau
  page.drawRectangle({ x: M, y: y - 6, width: width - M*2, height: 22, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('Description', { x: M + 8, y, size: 10, font: bold });
  page.drawText('Montant', { x: width - M - 80, y, size: 10, font: bold });
  y -= 26;

  const descLines = wrapText(invoiceData.description || '', helv, 10, width - M*2 - 100);
  for (const ln of descLines) {
    page.drawText(ln, { x: M + 8, y, size: 10, font: helv });
    y -= 14;
  }
  page.drawText(`${Number(invoiceData.amount || 0).toFixed(2)} €`, { x: width - M - 80, y: y + descLines.length * 14, size: 10, font: helv });

  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 24;

  // Total
  page.drawText('TOTAL', { x: width - M - 180, y, size: 14, font: bold });
  page.drawText(`${Number(invoiceData.amount || 0).toFixed(2)} €`, { x: width - M - 80, y, size: 14, font: bold, color: rgb(0.85, 0.6, 0.2) });

  // Pied de page
  page.drawText('Merci de votre confiance.', { x: M, y: 60, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(profile.name || '', { x: M, y: 30, size: 8, font: helv, color: rgb(0.6, 0.6, 0.6) });

  const outPath = path.join(OUTPUT_DIR, `facture_${invoiceData.invoiceNumber || Date.now()}.pdf`);
  fs.writeFileSync(outPath, await pdf.save());
  return outPath;
}

module.exports = { generatePDF, generateInvoicePDF };
