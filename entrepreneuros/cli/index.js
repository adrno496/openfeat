#!/usr/bin/env node
// cli/index.js — CLI EntrepreneurOS (mode API par défaut)
require('dotenv').config();
const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const keys = require('../lib/keys');
const ctx = require('../lib/context');
const mailer = require('../lib/mailer');
const cm = require('../lib/connection-manager');

const MODULES = {
  'business-plan': require('../modules/business-plan'),
  'invoice':       require('../modules/invoice'),
  'proposal':      require('../modules/proposal'),
  'email-campaign':require('../modules/email-campaign'),
  'legal':         require('../modules/legal-docs'),
  'forecast':      require('../modules/financial-forecast'),
  'cold-email':    require('../modules/cold-email'),
  'meeting':       require('../modules/meeting-summary'),
  'gtm':           require('../modules/gtm-plan'),
  'sop':           require('../modules/sop-generator')
};

const program = new Command();
program
  .name('eos')
  .description('EntrepreneurOS — CLI pour les 10 modules IA')
  .version('2.0.0');

program
  .command('modules')
  .description('Liste tous les modules disponibles')
  .action(() => {
    console.log('\nModules disponibles :\n');
    for (const [id, m] of Object.entries(MODULES)) {
      console.log(`  • ${id.padEnd(18)} — ${m.name}`);
    }
    console.log('');
  });

program
  .command('generate <module>')
  .description('Génère un document via un module (input JSON via --data ou stdin)')
  .option('-d, --data <json>', 'Données d\'entrée au format JSON')
  .option('-f, --file <path>', 'Fichier JSON contenant les données d\'entrée')
  .option('-t, --tier <tier>', 'Tier IA (haiku|sonnet|opus)', 'sonnet')
  .action(async (moduleId, opts) => {
    const mod = MODULES[moduleId];
    if (!mod) { console.error(`❌ Module inconnu : ${moduleId}`); process.exit(1); }
    let input = {};
    try {
      if (opts.file) input = JSON.parse(fs.readFileSync(opts.file, 'utf8'));
      else if (opts.data) input = JSON.parse(opts.data);
    } catch (e) {
      console.error('❌ JSON invalide :', e.message); process.exit(1);
    }
    console.log(`⏳ Génération en cours via mode "${cm.getMode()}", tier ${opts.tier}…`);
    try {
      const r = await mod.generate(input, { tier: opts.tier });
      console.log(`\n✅ Document créé : ${r.id}`);
      if (r.pdfPath) console.log(`📄 PDF : ${r.pdfPath}`);
      console.log(`\n--- CONTENU ---\n${r.content}\n`);
    } catch (e) {
      console.error('❌ Erreur :', e.message); process.exit(1);
    }
  });

program
  .command('list <module>')
  .description('Liste les documents générés pour un module')
  .action((moduleId) => {
    const mod = MODULES[moduleId];
    if (!mod) { console.error(`❌ Module inconnu : ${moduleId}`); process.exit(1); }
    const items = mod.list();
    if (!items.length) { console.log('(aucun document)'); return; }
    items.forEach((it) => console.log(`  ${it.id}  —  ${it.createdAt}`));
  });

program
  .command('send <module> <id> <email>')
  .description('Envoie un document existant par email (Resend)')
  .action(async (moduleId, id, email) => {
    const mod = MODULES[moduleId];
    if (!mod) { console.error(`❌ Module inconnu : ${moduleId}`); process.exit(1); }
    const doc = mod.get(id);
    if (!doc) { console.error('❌ Document introuvable'); process.exit(1); }
    try {
      const attachments = doc.pdfPath && fs.existsSync(doc.pdfPath)
        ? [{ path: doc.pdfPath, filename: path.basename(doc.pdfPath) }]
        : undefined;
      const r = await mailer.sendEmail({
        to: email,
        subject: `${mod.name} — ${id}`,
        text: doc.content,
        attachments
      });
      console.log(`✅ Email envoyé. ID : ${r.id || '—'}`);
    } catch (e) { console.error('❌', e.message); process.exit(1); }
  });

const keysCmd = program.command('keys').description('Gestion des clés API chiffrées');
keysCmd.command('list').action(() => {
  console.log('\nClés enregistrées :\n');
  for (const k of keys.listKeys()) {
    console.log(`  ${k.name.padEnd(22)} ${k.hasValue ? k.preview : '(vide)'}`);
  }
  console.log('');
});
keysCmd.command('set <name> <value>').action((name, value) => {
  keys.setKey(name, value); console.log(`✅ ${name} sauvegardée (chiffrée).`);
});
keysCmd.command('get <name>').action((name) => {
  const v = keys.getKey(name); console.log(v || '(non définie)');
});
keysCmd.command('test <name>').action(async (name) => {
  const v = keys.getKey(name);
  if (!v) { console.error('❌ Clé absente'); process.exit(1); }
  const r = await keys.validateKey(name, v);
  console.log(r.valid ? `✅ ${r.info || 'valide'}` : `❌ ${r.error}`);
});
keysCmd.command('delete <name>').action((name) => {
  keys.deleteKey(name); console.log(`✅ ${name} supprimée.`);
});

const profileCmd = program.command('profile').description('Profil entreprise');
profileCmd.command('show').action(() => console.log(JSON.stringify(ctx.getProfile(), null, 2)));
profileCmd.command('set <json>').action((json) => {
  try { console.log(JSON.stringify(ctx.saveProfile(JSON.parse(json)), null, 2)); }
  catch (e) { console.error('❌ JSON invalide'); }
});

program.parseAsync(process.argv).catch((e) => { console.error(e.message); process.exit(1); });
