// modules/content-plan.js — Planification éditoriale (calendrier de contenu)
const llm = require('../lib/llm');
const ctx = require('../lib/context');
const storage = require('../lib/storage');

const MODULE_ID = 'content-plan';

const SYSTEM_PROMPT = `Tu es un stratège content marketing pour entrepreneurs solos. Tu produis des plans éditoriaux concrets et actionnables, pas des grandes théories.

Principes :
- Mix réaliste pour un solo : 70% éducation/expertise, 20% inspiration/vision, 10% promo
- Chaque idée de post doit avoir : un angle clair, un hook, un format identifié, une plateforme cible
- Pas de "post motivationnel" générique — toujours ancré dans le sujet du créateur
- Recycler intelligemment : 1 idée → adaptation pour 3-4 plateformes (atomic content)
- Cadence soutenable pour un solo (3-5 posts/semaine, pas 20)
- Toujours intégrer une boucle : qu'est-ce qui se passe après le post ? CTA, séquence, conversion ?

Format de sortie : tableau markdown
| Jour | Plateforme | Format | Sujet | Hook | Objectif |`;

function buildUserPrompt(input) {
  const period = input.period || '4 semaines';
  return `Construis un plan éditorial sur **${period}** pour :

**Sujet / expertise principale** : ${input.expertise || 'non précisée'}
**Plateformes prioritaires** : ${input.platforms || 'LinkedIn + Instagram'}
**Audience cible** : ${input.audience || 'non précisée'}
**Cadence souhaitée** : ${input.cadence || '3-4 posts/semaine'}
**Objectif business sur la période** : ${input.objective || 'notoriété + génération de leads'}
${input.themes ? `**Thèmes à couvrir absolument** :\n${input.themes}` : ''}
${input.constraints ? `**Contraintes / sujets à éviter** :\n${input.constraints}` : ''}

Contexte entreprise :
${ctx.getSystemContext()}

Livrables attendus :
1. **Stratégie globale** (3-5 lignes) : positionnement éditorial sur la période
2. **Piliers de contenu** (3-5 piliers thématiques) avec proportion
3. **Calendrier détaillé** sous forme de tableau (toutes les publications de la période)
4. **Idées d'atomic content** : comment décliner chaque post en variantes pour d'autres formats
5. **Indicateurs de succès** à suivre (KPI réalistes pour un solo, pas de vanity metrics)
6. **Checklist hebdo** de ce que l'entrepreneur doit faire chaque semaine pour rester à jour`;
}

// Génère un iCalendar (.ics) à partir du contenu markdown — parse les lignes du tableau qui ont une date
function buildICS(markdownContent, projectName) {
  const lines = markdownContent.split('\n');
  const events = [];
  // Détecte les lignes de tableau format | Jour | Plateforme | Format | Sujet | Hook | Objectif |
  for (const ln of lines) {
    const cols = ln.split('|').map((s) => s.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cols.length < 4) continue;
    // Tente de parser une date dans la 1re col (formats : 2026-05-12, 12/05, lundi 12 mai, etc.)
    const dateMatch = cols[0].match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    if (!dateMatch) continue;
    let date;
    if (dateMatch[1]) date = new Date(dateMatch[1]);
    else {
      const [d, m, y] = dateMatch[2].split('/').map(Number);
      date = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
    }
    if (isNaN(date.getTime())) continue;
    const dt = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    events.push({
      uid: `${dt}-${Math.random().toString(36).slice(2, 8)}@entrepreneuros`,
      start: dt,
      title: cols.slice(1, 4).filter(Boolean).join(' — '),
      description: cols.slice(3).join(' | ')
    });
  }
  if (!events.length) return null;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EntrepreneurOS//Content Plan//FR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:Plan de contenu — ${projectName || 'Projet'}`,
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${e.start}`,
      `DURATION:PT30M`,
      `SUMMARY:${e.title.replace(/[\r\n]/g, ' ')}`,
      `DESCRIPTION:${e.description.replace(/[\r\n]/g, ' ')}`,
      'END:VEVENT'
    ]),
    'END:VCALENDAR'
  ].join('\r\n');
  return ics;
}

async function generate(input, options = {}) {
  const userPrompt = buildUserPrompt(input);
  const content = await llm.generate(SYSTEM_PROMPT, userPrompt, { tier: options.tier || 'sonnet', maxTokens: 4096, ...options });
  const ics = buildICS(content, input.expertise);
  return storage.save(MODULE_ID, { input, content, ics });
}

function list() { return storage.list(MODULE_ID); }
function get(id) { return storage.get(MODULE_ID, id); }

module.exports = { id: MODULE_ID, name: 'Planning de contenu', generate, list, get };
