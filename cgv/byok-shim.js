'use strict';

/* =========================================================================
   BYOK Shim — replaces Electron IPC with browser-side calls.
   Implements the same `window.electronAPI` contract used by app.js:
     - generateCGV(formData) → Promise<string>
     - saveDocx({ content, companyName, language }) → Promise<string|null>
     - printToPDF({ companyName }) → Promise<string|null>
     - openPath(filePath) → Promise<boolean>
     - onGenerationChunk(callback) → unsubscribe()
   ========================================================================= */

const STORAGE_KEY = 'cgv.anthropic.key';
const STORAGE_MODEL = 'cgv.anthropic.model';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

const chunkListeners = new Set();

function emitChunk(text) {
  for (const cb of chunkListeners) {
    try { cb(text); } catch (e) { console.error(e); }
  }
}

function getKey() {
  return (localStorage.getItem(STORAGE_KEY) || '').trim();
}
function setKey(k) {
  localStorage.setItem(STORAGE_KEY, (k || '').trim());
}
function getModel() {
  return localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
}
function setModel(m) {
  localStorage.setItem(STORAGE_MODEL, m || DEFAULT_MODEL);
}

function buildPrompt(data) {
  const lang = data.outputLanguage || 'FR';
  const isFR = lang === 'FR' || lang === 'BOTH';
  const isEN = lang === 'EN' || lang === 'BOTH';
  const today = new Date();
  const dateFR = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateEN = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const docTypes = [];
  if (isFR) docTypes.push('CGV (Conditions Générales de Vente)');
  if (isEN) docTypes.push('Terms and Conditions of Sale');

  return `You are a senior legal expert specializing in e-commerce, digital business law, and consumer protection regulations across France, EU, UK, USA, and Canada.

Generate complete, professional, legally sound ${docTypes.join(' AND ')} for the following business.

BUSINESS INFORMATION:
- Company name: ${data.companyName}
- Legal form: ${data.legalForm}
- SIRET / Company number: ${data.siret || 'N/A'}
- Country of registration: ${data.country}
- Registered address: ${data.address}
- Contact email: ${data.contactEmail}
- Website: ${data.website}

BUSINESS ACTIVITY:
- Business type: ${data.businessType}
- Products / services: ${data.productDescription}
- Price range: ${data.priceRange}
- Target markets: ${(data.targetCountries || []).join(', ') || 'N/A'}

LEGAL OPTIONS:
- Return policy: ${data.returnPolicy}${data.returnDetails ? '\n- Return policy details: ' + data.returnDetails : ''}
- Warranty: ${data.warrantyType}
- Payment methods: ${(data.paymentMethods || []).join(', ') || 'N/A'}
- Delivery timeline: ${data.deliveryDelay}
- GDPR data controller: ${data.dataController || 'The company itself'}

DOCUMENT SETTINGS:
- Applicable jurisdiction: ${data.jurisdiction}
- Document style: ${data.documentStyle}
- Output language: ${lang}

REQUIREMENTS:
${isFR ? `
- Rédiger des CGV françaises COMPLÈTES, conformes au :
  * Code de la consommation (articles L121-1 et suivants, L221-5, L221-18 sur le droit de rétractation)
  * Directive européenne 2011/83/UE relative aux droits des consommateurs
  * RGPD (Règlement (UE) 2016/679)
  * Loi pour la confiance dans l'économie numérique (LCEN n° 2004-575)
  * Code civil (articles 1217 et suivants sur l'inexécution contractuelle)
- Inclure TOUTES les sections obligatoires :
  Article 1 — Objet et champ d'application
  Article 2 — Acceptation des conditions
  Article 3 — Identification du vendeur
  Article 4 — Produits / services
  Article 5 — Prix
  Article 6 — Commandes
  Article 7 — Modalités de paiement
  Article 8 — Livraison
  Article 9 — Droit de rétractation
  Article 10 — Garanties (légale de conformité, vices cachés)
  Article 11 — Responsabilité
  Article 12 — Protection des données personnelles (RGPD)
  Article 13 — Propriété intellectuelle
  Article 14 — Force majeure
  Article 15 — Litiges et droit applicable
  Article 16 — Médiation de la consommation
- Date de mise à jour : ${dateFR}
` : ''}
${isEN ? `
- Write COMPLETE English Terms & Conditions of Sale compliant with the specified jurisdiction (${data.jurisdiction}).
- Include all mandatory sections:
  Article 1 — Purpose and scope
  Article 2 — Acceptance of terms
  Article 3 — Seller identification
  Article 4 — Products / services
  Article 5 — Pricing
  Article 6 — Orders
  Article 7 — Payment terms
  Article 8 — Delivery
  Article 9 — Right of withdrawal / Returns
  Article 10 — Warranties
  Article 11 — Liability
  Article 12 — Data protection (GDPR / applicable privacy law)
  Article 13 — Intellectual property
  Article 14 — Force majeure
  Article 15 — Disputes and governing law
  Article 16 — Consumer mediation / dispute resolution
- Last updated: ${dateEN}
` : ''}
${lang === 'BOTH' ? `
- Output the FRENCH version FIRST under the header "## CONDITIONS GÉNÉRALES DE VENTE", then the ENGLISH version under the header "## TERMS AND CONDITIONS OF SALE".
- Separate the two versions with a clear horizontal rule.
` : ''}

OUTPUT FORMAT:
- Use markdown formatting.
- Top-level document title with "## " prefix.
- Each article header with "### Article N — Title".
- Use **bold** for emphasized sub-clauses.
- Justified, professional legal prose.
- USE THE ACTUAL DATA PROVIDED — do NOT use placeholders like [INSERT NAME], [COMPANY], [DATE]. Substitute the real values from above.
- Minimum 1500 words per language version.
- Do not include any meta-comments, instructions, or explanations outside the document itself.
- Start directly with the document title. End directly with the last article.

Generate the complete document now:`;
}

async function callClaudeStream(prompt, apiKey, model) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    let detail = '';
    try {
      const t = await res.text();
      try {
        const j = JSON.parse(t);
        detail = j.error?.message || t;
      } catch { detail = t; }
    } catch {}
    if (res.status === 401 || res.status === 403) {
      throw new Error('CLAUDE_AUTH_ERROR' + (detail ? ': ' + detail : ''));
    }
    if (res.status === 429) {
      throw new Error('Rate limited by Anthropic. Please retry in a moment.');
    }
    throw new Error(`Anthropic API error ${res.status}${detail ? ': ' + detail : ''}`);
  }

  if (!res.body) throw new Error('Streaming not supported by this browser.');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const ev of events) {
      const dataLines = ev.split('\n').filter(l => l.startsWith('data:'));
      for (const dl of dataLines) {
        const payload = dl.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          if (j.type === 'content_block_delta' && j.delta?.text) {
            full += j.delta.text;
            emitChunk(j.delta.text);
          } else if (j.type === 'message_delta' && j.delta?.stop_reason === 'error') {
            throw new Error('Stream stopped with error.');
          } else if (j.type === 'error') {
            throw new Error(j.error?.message || 'Anthropic stream error');
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  return full;
}

/* ----- Markdown → Word HTML ----- */
function escapeHtmlBasic(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function mdInline(s) {
  let out = escapeHtmlBasic(s);
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
  return out;
}
function mdToWordHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); out.push(''); continue; }
    if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr>'); continue; }
    let m;
    if ((m = line.match(/^##\s+(.*)$/))) { closeList(); out.push(`<h1 style="text-align:center;font-family:Georgia,serif;">${mdInline(m[1])}</h1>`); continue; }
    if ((m = line.match(/^###\s+(.*)$/))) { closeList(); out.push(`<h2 style="margin-top:18pt;font-family:Georgia,serif;">${mdInline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^####\s+(.*)$/))) { closeList(); out.push(`<h3 style="font-family:Georgia,serif;">${mdInline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${mdInline(m[1])}</li>`); continue;
    }
    closeList();
    out.push(`<p style="text-align:justify;font-family:Georgia,serif;font-size:11pt;line-height:1.5;">${mdInline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function buildWordDoc(content, companyName, language) {
  const title = (language === 'FR' || language === 'BOTH')
    ? `CGV — ${companyName}`
    : `Terms — ${companyName}`;
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtmlBasic(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page { size: A4; margin: 2cm 2.2cm; }
body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; color: #111; }
h1 { font-size: 20pt; }
h2 { font-size: 14pt; }
h3 { font-size: 12pt; }
p { margin: 0 0 8pt 0; }
ul { margin: 0 0 8pt 18pt; }
hr { border: none; border-top: 1px solid #888; margin: 14pt 0; }
</style></head>
<body>${mdToWordHtml(content)}</body></html>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

/* ----- BYOK key gate UI ----- */
function ensureKeyDialog() {
  return new Promise((resolve) => {
    const existing = getKey();
    if (existing) return resolve(existing);

    const overlay = document.createElement('div');
    overlay.className = 'modal byok-modal';
    overlay.innerHTML = `
      <div class="modal-card byok-card">
        <h3>Clé API Anthropic requise</h3>
        <p style="margin:0 0 14px 0; line-height:1.5;">
          Cette app appelle directement l'API Anthropic depuis ton navigateur (BYOK).
          Ta clé est stockée uniquement dans <code>localStorage</code> sur cet appareil
          et n'est jamais envoyée ailleurs.
        </p>
        <p style="margin:0 0 14px 0; font-size:13px; opacity:.75;">
          Pas encore de clé ? <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">console.anthropic.com</a>
        </p>
        <input type="password" id="byokKeyInput" placeholder="sk-ant-…" autocomplete="off"
               style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:#fff;font-family:JetBrains Mono,monospace;font-size:13px;margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:14px;opacity:.85;">
          <span>Modèle :</span>
          <select id="byokModelSelect" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.3);color:#fff;font-size:13px;">
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (recommandé)</option>
            <option value="claude-opus-4-1-20250805">Claude Opus 4.1 (plus précis, plus cher)</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (rapide, économique)</option>
          </select>
        </label>
        <div class="modal-actions">
          <button id="byokSave" class="btn-primary">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.classList.remove('hidden');

    const input = overlay.querySelector('#byokKeyInput');
    const select = overlay.querySelector('#byokModelSelect');
    select.value = getModel();

    setTimeout(() => input.focus(), 50);

    const submit = () => {
      const v = input.value.trim();
      if (!v.startsWith('sk-ant-')) {
        input.style.borderColor = '#ff5563';
        input.focus();
        return;
      }
      setKey(v);
      setModel(select.value);
      overlay.remove();
      resolve(v);
    };

    overlay.querySelector('#byokSave').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  });
}

/* ----- Settings button injection (after init) ----- */
function injectSettingsButton() {
  document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn';
    btn.style.cssText = 'margin-top:10px;width:100%;font-size:12px;opacity:.8;';
    btn.textContent = '⚙ Clé API';
    btn.addEventListener('click', () => {
      if (confirm('Réinitialiser la clé API Anthropic ?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
    footer.appendChild(btn);
  });
}
injectSettingsButton();

/* ----- Public API exposed as window.electronAPI ----- */
window.electronAPI = {
  generateCGV: async (formData) => {
    const apiKey = await ensureKeyDialog();
    const model = getModel();
    const prompt = buildPrompt(formData);
    try {
      return await callClaudeStream(prompt, apiKey, model);
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('CLAUDE_AUTH_ERROR') || /401|403|invalid api key|authentication/i.test(msg)) {
        localStorage.removeItem(STORAGE_KEY);
        throw new Error('CLAUDE_AUTH_ERROR');
      }
      throw e;
    }
  },

  saveDocx: async ({ content, companyName, language }) => {
    if (!content) return null;
    const safeName = (companyName || 'CGV').replace(/[^a-z0-9_-]/gi, '_').slice(0, 50);
    const filename = `CGV_${safeName}_${new Date().toISOString().slice(0, 10)}.doc`;
    const html = buildWordDoc(content, companyName || 'Company', language || 'FR');
    const blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, filename);
    return filename;
  },

  printToPDF: async ({ companyName }) => {
    const safeName = (companyName || 'CGV').replace(/[^a-z0-9_-]/gi, '_').slice(0, 50);
    const previousTitle = document.title;
    document.title = `CGV_${safeName}_${new Date().toISOString().slice(0, 10)}`;
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing');
        document.title = previousTitle;
      }, 200);
    }, 50);
    return document.title + '.pdf';
  },

  openPath: async () => false,

  onGenerationChunk: (cb) => {
    chunkListeners.add(cb);
    return () => chunkListeners.delete(cb);
  }
};
