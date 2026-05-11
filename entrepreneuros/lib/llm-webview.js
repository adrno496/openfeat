// lib/llm-webview.js — Mode 2 : pilotage d'une session web Claude/ChatGPT via BrowserView
//
// La logique réelle d'injection vit dans lib/webview-bridge.js (côté main process).
// Ce module expose une façade homogène avec les autres backends.

let _bridge = null;

function setBridge(bridge) {
  _bridge = bridge;
}

function getBridge() {
  if (!_bridge) throw new Error('WebView bridge non initialisé (appel depuis main process attendu)');
  return _bridge;
}

async function generate(systemPrompt, userPrompt, options = {}) {
  const bridge = getBridge();
  const provider = options.webviewProvider || 'claude';
  await bridge.ensureProvider(provider);
  const logged = await bridge.isLoggedIn();
  if (!logged) {
    throw new Error('Session web non connectée. Ouvrez Settings → WebView → Se connecter.');
  }
  // Préfixe anti-artefact : empêche Claude.ai d'utiliser son panneau latéral
  // (sinon notre scraper récupère "Derniers ajustements visuels…" au lieu du contenu).
  const antiArtefact = `IMPORTANT (instruction technique) : réponds intégralement dans le fil de conversation en markdown. N'utilise PAS la fonctionnalité "artifact" / panneau latéral, même pour du code ou des documents longs. Si tu produis du code ou un document, mets-le directement dans ta réponse sous forme de blocs markdown.`;

  const fullPrompt = systemPrompt
    ? `${antiArtefact}\n\n---\n\n${systemPrompt}\n\n---\n\n${userPrompt}`
    : `${antiArtefact}\n\n---\n\n${userPrompt}`;
  return await bridge.sendPrompt(fullPrompt, {
    timeoutMs: options.timeoutMs || 240000,
    onChunk: options.onChunk
  });
}

async function testConnection(cfg) {
  try {
    const bridge = getBridge();
    await bridge.ensureProvider(cfg.webviewProvider || 'claude');
    const logged = await bridge.isLoggedIn();
    if (!logged) return { ok: false, error: 'Session non connectée — utilisez "Se connecter".' };
    return { ok: true, note: `Session active sur ${cfg.webviewProvider}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { generate, testConnection, setBridge };
