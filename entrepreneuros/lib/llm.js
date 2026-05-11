// lib/llm.js — Dispatcher vers le mode IA actif
const { getConfig } = require('./connection-manager');
const apiBackend = require('./llm-api');
const localBackend = require('./llm-local');
const webviewBackend = require('./llm-webview');

function buildStyleSuffix(style) {
  if (!style || typeof style !== 'object') return '';
  const parts = [];
  if (style.tone) parts.push(`Adopte un ton **${style.tone}** dans toute la réponse.`);
  if (style.length) {
    const map = {
      court: 'Sois CONCIS : va à l\'essentiel, supprime les sections accessoires, vise -50% par rapport à la longueur standard.',
      long: 'Sois DÉTAILLÉ : développe chaque point, ajoute des exemples, vise +50% par rapport à la longueur standard.',
      exhaustif: 'Sois EXHAUSTIF : couvre tous les angles, sous-sections, exceptions, edge cases. Ne laisse rien de côté.'
    };
    if (map[style.length]) parts.push(map[style.length]);
  }
  if (style.audienceLevel) {
    const map = {
      grand_public: 'Cible un public NON-EXPERT : vulgarise, évite le jargon, donne du contexte.',
      specialiste:  'Cible des SPÉCIALISTES du domaine : vocabulaire technique précis, références implicites OK.',
      decideur:     'Cible un DÉCIDEUR pressé : synthèse exécutive en haut, chiffres clés mis en avant, recommandations actionnables.',
      investisseur: 'Cible un INVESTISSEUR / banquier : focalise sur le ROI, les risques, les hypothèses chiffrées et la défense des chiffres.',
      client:       'Cible un CLIENT / prospect : adopte un ton orienté valeur perçue, bénéfices concrets, sans jargon interne.'
    };
    if (map[style.audienceLevel]) parts.push(map[style.audienceLevel]);
  }
  return parts.length ? '\n\n## Contraintes de style supplémentaires\n' + parts.join('\n') : '';
}

async function generate(systemPrompt, userPrompt, options = {}) {
  const cfg = getConfig();
  const mode = options.mode || cfg.mode || 'api';
  const styleSuffix = buildStyleSuffix(options.style);
  const finalSystem = (systemPrompt || '') + styleSuffix;
  // Pièces jointes universelles : injection en fin de user prompt
  const finalUser = (userPrompt || '') + (options.attachmentsContext || '');
  try {
    if (mode === 'api')     return await apiBackend.generate(finalSystem, finalUser, { ...cfg, ...options });
    if (mode === 'webview') return await webviewBackend.generate(finalSystem, finalUser, { ...cfg, ...options });
    if (mode === 'local')   return await localBackend.generate(finalSystem, finalUser, { ...cfg, ...options });
    throw new Error(`Mode IA inconnu : ${mode}`);
  } catch (e) {
    throw new Error(`[LLM:${mode}] ${e.message}`);
  }
}

// Affinage d'un document existant : prend le contenu actuel + une instruction,
// renvoie une version révisée. Streaming supporté via options.onChunk.
async function refine(currentDoc, instruction, options = {}) {
  const system = `Tu es un éditeur expert. Tu reçois un document existant et une instruction de modification.
Tu dois renvoyer la VERSION COMPLÈTE RÉVISÉE du document, pas seulement les changements.
Conserve la structure et le ton du document d'origine sauf si l'instruction demande explicitement de les changer.
Réponds en markdown, sans introduction ni explication — uniquement le document révisé.`;

  const user = `## Document actuel

${currentDoc}

---

## Instruction de modification

${instruction}

---

Renvoie le document complet révisé.`;

  return await generate(system, user, options);
}

async function testConnection(mode) {
  const cfg = getConfig();
  const m = mode || cfg.mode;
  try {
    if (m === 'api')     return await apiBackend.testConnection(cfg);
    if (m === 'webview') return await webviewBackend.testConnection(cfg);
    if (m === 'local')   return await localBackend.testConnection(cfg);
    return { ok: false, error: `Mode inconnu : ${m}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { generate, refine, testConnection };
