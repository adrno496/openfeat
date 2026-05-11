// audio.js — Synthèse audio via Web Audio API. Aucune ressource externe.
// Tous les sons sont générés à la volée via oscillateurs + enveloppes.
// Toggle dans settings ; respecte prefers-reduced-motion (mute par défaut).

import { Storage } from './storage.js';

let _ctx = null;
let _enabled = null;

function isAudioEnabled() {
  if (_enabled !== null) return _enabled;
  try {
    _enabled = Storage.getSettings().audioEnabled === true;
  } catch {
    _enabled = false;
  }
  return _enabled;
}

export function setAudioEnabled(value) {
  _enabled = !!value;
  try { Storage.saveSettings({ audioEnabled: _enabled }); } catch {}
  if (_enabled) ensureCtx();
}

function ensureCtx() {
  if (_ctx) return _ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    _ctx = new AC();
    return _ctx;
  } catch (err) {
    console.warn('[audio] AudioContext init failed:', err);
    return null;
  }
}

// Joue un oscillateur avec une enveloppe simple (attack rapide, release decay).
// Robuste : retourne silencieusement si Web Audio est indispo ou désactivé.
function playOsc({ freq = 440, type = 'sine', duration = 0.15, gain = 0.18, attack = 0.005, release = 0.08, detune = 0 }) {
  if (!isAudioEnabled()) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (detune) osc.detune.setValueAtTime(detune, now);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.linearRampToValueAtTime(gain, now + duration - release);
    env.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  } catch (err) {
    console.warn('[audio] playOsc failed:', err);
  }
}

// Glide (slide de fréquence) — utilisé pour le gameover
function playGlide({ freqStart = 440, freqEnd = 220, duration = 0.8, type = 'sine', gain = 0.16 }) {
  if (!isAudioEnabled()) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.04);
    env.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  } catch (err) {
    console.warn('[audio] playGlide failed:', err);
  }
}

// Tonalités sémantiques. playTone(name) — l'API publique du module.
export function playTone(name) {
  switch (name) {
    case 'choice':
      playOsc({ freq: 440, type: 'triangle', duration: 0.1, gain: 0.14 });
      break;
    case 'consequence':
      playOsc({ freq: 220, type: 'sine', duration: 0.22, gain: 0.16, release: 0.12 });
      break;
    case 'danger':
      playOsc({ freq: 880, type: 'square', duration: 0.08, gain: 0.10 });
      setTimeout(() => playOsc({ freq: 880, type: 'square', duration: 0.08, gain: 0.10 }), 140);
      break;
    case 'achievement':
      playOsc({ freq: 523.25, type: 'triangle', duration: 0.14, gain: 0.16 }); // do
      setTimeout(() => playOsc({ freq: 659.25, type: 'triangle', duration: 0.14, gain: 0.16 }), 130); // mi
      setTimeout(() => playOsc({ freq: 783.99, type: 'triangle', duration: 0.30, gain: 0.18 }), 260); // sol
      break;
    case 'gameover':
      playGlide({ freqStart: 440, freqEnd: 130, duration: 1.0, type: 'sawtooth', gain: 0.12 });
      break;
    case 'unlock':
      playOsc({ freq: 880, type: 'sine', duration: 0.1, gain: 0.12 });
      setTimeout(() => playOsc({ freq: 1108, type: 'sine', duration: 0.16, gain: 0.14 }), 80);
      break;
    default:
      console.warn('[audio] unknown tone:', name);
  }
}
