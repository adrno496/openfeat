// lib/mailer.js — Envoi d'email transactionnel via Resend
const fs = require('fs');
const path = require('path');
const keys = require('./keys');

async function sendEmail({ to, subject, html, text, attachments }) {
  const apiKey = keys.requireKey('RESEND_API_KEY');
  const from = keys.getKey('EMAIL_FROM') || 'EntrepreneurOS <onboarding@resend.dev>';
  const { Resend } = require('resend');
  const resend = new Resend(apiKey);

  const payload = { from, to, subject, html: html || undefined, text: text || undefined };

  if (Array.isArray(attachments) && attachments.length) {
    payload.attachments = attachments.map((a) => {
      if (a.path && fs.existsSync(a.path)) {
        return { filename: a.filename || path.basename(a.path), content: fs.readFileSync(a.path).toString('base64') };
      }
      return { filename: a.filename || 'fichier', content: a.content };
    });
  }

  const r = await resend.emails.send(payload);
  if (r.error) throw new Error(`Resend : ${r.error.message || JSON.stringify(r.error)}`);
  return { id: r.data?.id || null, ok: true };
}

module.exports = { sendEmail };
