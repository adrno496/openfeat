// lib/webview-bridge.js — Pilote une BrowserView (Claude.ai ou ChatGPT) depuis le main process.
//
// Méthodes :
//   ensureProvider(provider)  - charge l'URL si nécessaire
//   showLogin() / hideLogin() - bascule l'overlay BrowserView dans la fenêtre
//   isLoggedIn()              - vérifie via cookies de session
//   sendPrompt(text, opts)    - injecte le prompt et attend la réponse stable
//
// Cette classe doit être instanciée depuis main.js avec une référence à la BrowserWindow.

const { BrowserView } = require('electron');

const PROVIDERS = {
  claude:  { url: 'https://claude.ai/new',     cookieDomain: '.claude.ai',     cookieName: 'sessionKey' },
  chatgpt: { url: 'https://chatgpt.com/',      cookieDomain: '.chatgpt.com',   cookieName: '__Secure-next-auth.session-token' }
};

class WebViewBridge {
  constructor(mainWindow) {
    this.win = mainWindow;
    this.view = null;
    this.provider = null;
    this.visible = false;
  }

  _ensureView() {
    if (this.view) return;
    this.view = new BrowserView({
      webPreferences: {
        partition: 'persist:eos-webview',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    this.win.addBrowserView(this.view);
    this._layoutHidden();
  }

  _layoutHidden() {
    // BrowserView techniquement attachée mais hors écran (taille 0).
    if (!this.view) return;
    this.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    this.visible = false;
  }

  _layoutVisible() {
    if (!this.view) return;
    const [w, h] = this.win.getContentSize();
    this.view.setBounds({ x: 0, y: 38, width: w, height: h - 38 });
    this.view.setAutoResize({ width: true, height: true });
    this.visible = true;
  }

  async ensureProvider(provider) {
    const cfg = PROVIDERS[provider];
    if (!cfg) throw new Error(`Provider WebView inconnu : ${provider}`);
    this._ensureView();
    if (this.provider !== provider) {
      this.provider = provider;
      await this.view.webContents.loadURL(cfg.url);
    } else if (!this.view.webContents.getURL()) {
      await this.view.webContents.loadURL(cfg.url);
    }
  }

  async showLogin() {
    this._ensureView();
    if (!this.provider) await this.ensureProvider('claude');
    this._layoutVisible();
    return true;
  }

  async hideLogin() {
    this._layoutHidden();
    return true;
  }

  async isLoggedIn() {
    if (!this.view || !this.provider) return false;
    try {
      const cfg = PROVIDERS[this.provider];
      const ses = this.view.webContents.session;
      const cookies = await ses.cookies.get({ domain: cfg.cookieDomain });
      return cookies.some((c) => c.name === cfg.cookieName && c.value && c.value.length > 10);
    } catch (e) {
      return false;
    }
  }

  async sendPrompt(text, options = {}) {
    if (!this.view || !this.provider) {
      throw new Error('WebView non initialisée — appelez ensureProvider() en amont');
    }
    const wc = this.view.webContents;
    const escaped = JSON.stringify(text);

    // Sélecteurs (plusieurs en fallback, claude.ai/chatgpt.com changent leur DOM régulièrement)
    const SELECTORS = {
      claude: {
        inputs: [
          'div.ProseMirror[contenteditable="true"]',
          'fieldset div[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]',
          'div[contenteditable="true"]'
        ],
        sendBtns: [
          'button[aria-label="Send message"]',
          'button[aria-label="Envoyer le message"]',
          'button[aria-label*="end"][type="button"]',
          'fieldset button[type="button"]:not([disabled])'
        ],
        outputs: [
          'div[data-testid="user-message"] ~ * div.font-claude-response',
          'div.font-claude-response',
          'div.font-claude-message',
          'div[data-testid="message-text"]',
          'div[data-is-streaming]'
        ],
        streaming: 'div[data-is-streaming="true"]'
      },
      chatgpt: {
        inputs: [
          'div#prompt-textarea',
          'textarea#prompt-textarea',
          'div[contenteditable="true"]#prompt-textarea',
          'div[contenteditable="true"]'
        ],
        sendBtns: [
          'button[data-testid="send-button"]',
          'button[aria-label="Send prompt"]',
          'button[aria-label*="end"]'
        ],
        outputs: [
          'div[data-message-author-role="assistant"] .markdown',
          'div[data-message-author-role="assistant"]'
        ],
        streaming: '[data-testid="stop-button"], button[aria-label="Stop streaming"]'
      }
    };
    const sel = SELECTORS[this.provider];

    // 1) Injection du texte + envoi (essai paste, fallback innerText, puis bouton Send sinon Enter)
    const injectionResult = await wc.executeJavaScript(`(async () => {
      const inputSelectors = ${JSON.stringify(sel.inputs)};
      const sendSelectors  = ${JSON.stringify(sel.sendBtns)};
      let input = null;
      for (const s of inputSelectors) {
        const el = document.querySelector(s);
        if (el && (el.offsetParent !== null || el.getClientRects().length)) { input = el; break; }
      }
      if (!input) return { ok: false, error: 'Champ de saisie introuvable' };
      input.focus();
      input.click();

      // Paste via ClipboardEvent
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', ${escaped});
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      } catch (e) {}

      await new Promise(r => setTimeout(r, 200));

      // Fallback texte direct si vide après paste
      const currentText = (input.tagName === 'TEXTAREA') ? input.value : input.innerText;
      if (!currentText || !currentText.trim()) {
        if (input.tagName === 'TEXTAREA') {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(input, ${escaped});
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // ProseMirror : insérer un <p> avec le texte
          input.innerHTML = '';
          const lines = ${escaped}.split('\\n');
          for (const line of lines) {
            const p = document.createElement('p');
            p.textContent = line || '';
            input.appendChild(p);
          }
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${escaped} }));
        }
      }

      await new Promise(r => setTimeout(r, 350));

      // Tentative bouton Send
      let sent = false;
      for (const s of sendSelectors) {
        const btn = document.querySelector(s);
        if (btn && !btn.disabled && btn.offsetParent !== null) {
          btn.click();
          sent = true;
          break;
        }
      }
      // Fallback : Enter
      if (!sent) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }
      return { ok: true, sentVia: sent ? 'button' : 'enter' };
    })()`);

    if (!injectionResult || !injectionResult.ok) {
      throw new Error('Injection prompt échouée : ' + (injectionResult && injectionResult.error || 'unknown'));
    }

    // 2) Polling de la réponse jusqu'à stabilisation OU fin de streaming
    // - Filtre les messages d'attente de Claude.ai ("Derniers ajustements visuels", etc.)
    // - Privilégie le contenu d'artefact si Claude utilise son panneau latéral
    // - Détecte la fin via absence de "stop button" + présence de boutons d'action post-réponse
    const timeoutMs = options.timeoutMs || 240000;
    const start = Date.now();
    let lastText = '';
    let stableCount = 0;
    let onChunk = options.onChunk;
    const POLL_INTERVAL = 700;
    const STABLE_REQUIRED = 4;

    // Patterns de textes transitoires (Claude.ai pendant qu'il génère un artefact)
    const TRANSIENT_PATTERNS = [
      /^Derniers ajustements visuels/i,
      /^Génération en cours/i,
      /^Generating/i,
      /^Thinking/i,
      /^Réflexion/i,
      /^Analyse en cours/i,
      /^…$/,
      /^\.+$/
    ];

    const isTransient = (t) => {
      if (!t) return true;
      const trimmed = t.trim();
      if (trimmed.length < 8) return true;
      return TRANSIENT_PATTERNS.some((rx) => rx.test(trimmed));
    };

    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      const snap = await wc.executeJavaScript(`(() => {
        const outSels = ${JSON.stringify(sel.outputs)};
        let nodes = [];
        for (const s of outSels) {
          const found = document.querySelectorAll(s);
          if (found.length) { nodes = found; break; }
        }
        const last = nodes[nodes.length - 1];
        const messageText = last ? (last.innerText || '').trim() : '';

        // Tentative de lecture d'un artefact (Claude.ai panneau latéral)
        let artifactText = '';
        const artifactSelectors = [
          'div[data-testid="artifact-preview"]',
          'div[class*="artifact"] pre',
          'div[class*="artifact"] [contenteditable="false"]',
          'div[class*="artifact-content"]',
          'iframe[title*="rtifact"]',
          'div[role="dialog"] pre',
          'div[role="dialog"] .markdown',
          'div[role="dialog"] [class*="prose"]'
        ];
        for (const s of artifactSelectors) {
          const el = document.querySelector(s);
          if (el) {
            if (el.tagName === 'IFRAME') {
              try { artifactText = (el.contentDocument && el.contentDocument.body && el.contentDocument.body.innerText) || ''; } catch (e) {}
            } else {
              artifactText = (el.innerText || '').trim();
            }
            if (artifactText && artifactText.length > 30) break;
          }
        }

        // Détection de l'état de streaming
        const streaming = !!document.querySelector(${JSON.stringify(sel.streaming)});
        // Boutons post-réponse (présents seulement quand la génération est finie)
        const doneIndicator = !!document.querySelector('button[aria-label*="opy"]:not([disabled]), button[data-testid="copy-message"], button[aria-label*="Edit message"]');

        return { messageText, artifactText, streaming, doneIndicator };
      })()`).catch(() => ({ messageText: '', artifactText: '', streaming: false, doneIndicator: false }));

      // Choix du texte : artefact prioritaire si présent ET non-trivial, sinon message
      let current = '';
      if (snap.artifactText && snap.artifactText.length > Math.max(50, snap.messageText.length)) {
        current = snap.artifactText;
      } else if (!isTransient(snap.messageText)) {
        current = snap.messageText;
      } else if (snap.artifactText) {
        current = snap.artifactText;
      } else {
        current = snap.messageText;
      }

      // Pousse le streaming partiel vers le renderer si onChunk fourni
      if (onChunk && current && current !== lastText && !isTransient(current)) {
        try {
          const delta = current.startsWith(lastText) ? current.slice(lastText.length) : current;
          onChunk(delta, current);
        } catch (e) {}
      }

      const generationFinished = !snap.streaming && (snap.doneIndicator || stableCount > 0);
      if (generationFinished && current && current === lastText && !isTransient(current)) {
        stableCount += 1;
        if (stableCount >= STABLE_REQUIRED) return current;
      } else if (current === lastText) {
        // texte inchangé mais streaming peut être actif → on patiente
      } else {
        stableCount = 0;
        lastText = current;
      }
    }

    if (lastText && !isTransient(lastText)) return lastText;
    throw new Error('Timeout WebView : aucune réponse stable obtenue. Cause probable : Claude génère un artefact dans son panneau latéral. Conseils : (1) Demande des réponses en markdown direct sans artefact ; (2) Réduis la taille du prompt ; (3) Bascule en mode API pour des résultats fiables.');
  }
}

module.exports = { WebViewBridge, PROVIDERS };
