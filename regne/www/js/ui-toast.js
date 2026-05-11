// ui-toast.js — Système de notifications inline.
// Remplace alert() pour rester dans l'UI du jeu (parchemin, pas WebView system).

let _container = null;
let _idCounter = 0;

function ensureContainer() {
  if (_container && _container.isConnected) return _container;
  _container = document.getElementById('toast-container');
  if (!_container) {
    _container = document.createElement('div');
    _container.id = 'toast-container';
    _container.className = 'toast-container';
    document.body.appendChild(_container);
  }
  return _container;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// type: info | success | warn | error
// duration: ms, 0 = persistant (l'utilisateur ferme manuellement)
export function showToast(message, { type = 'info', duration = 4000, icon = null } = {}) {
  if (typeof document === 'undefined') return null;
  const container = ensureContainer();
  const id = ++_idCounter;
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.dataset.toastId = String(id);
  const ic = icon || ({ info: 'ℹ', success: '✓', warn: '⚠', error: '✕' }[type] || '');
  node.innerHTML = `
    <span class="toast-icon">${escapeHtml(ic)}</span>
    <span class="toast-msg">${escapeHtml(String(message))}</span>
    <button class="toast-close" aria-label="Fermer">×</button>
  `;
  container.appendChild(node);

  // Animation d'entrée
  requestAnimationFrame(() => node.classList.add('toast-show'));

  const close = () => {
    if (!node.isConnected) return;
    node.classList.remove('toast-show');
    node.classList.add('toast-leaving');
    setTimeout(() => { try { node.remove(); } catch {} }, 250);
  };

  node.querySelector('.toast-close')?.addEventListener('click', close);
  let timer = null;
  if (duration > 0) timer = setTimeout(close, duration);

  return {
    close: () => { if (timer) clearTimeout(timer); close(); }
  };
}

export function toastError(msg, duration = 5000) {
  return showToast(msg, { type: 'error', duration });
}

export function toastSuccess(msg, duration = 3500) {
  return showToast(msg, { type: 'success', duration });
}

export function toastWarn(msg, duration = 4500) {
  return showToast(msg, { type: 'warn', duration });
}

// Confirme une action via une modale légère (remplace confirm() natif).
// Retourne une Promise<boolean>.
export function confirmDialog(message, { okLabel = 'Confirmer', cancelLabel = 'Annuler' } = {}) {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card" role="dialog" aria-modal="true">
        <div class="confirm-message">${escapeHtml(String(message))}</div>
        <div class="confirm-actions">
          <button class="secondary-btn confirm-cancel">${escapeHtml(cancelLabel)}</button>
          <button class="primary-btn confirm-ok">${escapeHtml(okLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cleanup = (val) => {
      try { overlay.remove(); } catch {}
      resolve(val);
    };
    overlay.querySelector('.confirm-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm-ok').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
  });
}
