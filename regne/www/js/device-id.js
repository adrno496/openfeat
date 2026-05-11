// device-id.js — UUID v4 stable persisté en localStorage. Utilisé pour le quota freemium.

const LS_KEY = 'regne_device_id';

function randomUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback Math.random pour navigateurs très anciens.
  // Format : xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y ∈ 8,9,a,b)
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { s += '-'; continue; }
    if (i === 14) { s += '4'; continue; }
    if (i === 19) { s += hex[(Math.random() * 4) | 0 | 8]; continue; }
    s += hex[(Math.random() * 16) | 0];
  }
  return s;
}

export function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem(LS_KEY); } catch {}
  if (id && /^[A-Za-z0-9-]{8,64}$/.test(id)) return id;
  id = randomUuidV4();
  try { localStorage.setItem(LS_KEY, id); } catch {}
  return id;
}
