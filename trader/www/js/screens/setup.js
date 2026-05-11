// 3-step onboarding: choose wallet → choose network → ping.
import { Storage, DEFAULT_CONFIG } from '../core/storage.js';
import { generateWallet, addressFromPrivateKey } from '../core/signer.js';
import { HLExchange } from '../core/exchange.js';
import { requestPermission } from '../core/notifications.js';
import { toast } from '../ui/toast.js';
import { showScreen, startBot } from '../app.js';

const draft = {
  step: 1,
  privateKey: null,
  address: null,
  network: 'testnet',
  acknowledged: false,
};

export function initSetupScreen() {
  render();
}

function render() {
  const root = document.getElementById('screen-setup');
  root.innerHTML = `
    <div class="setup-shell">
      <div class="setup-logo">HL <span>TRADER</span></div>
      <div class="setup-tagline">Hyperliquid Automated Trading</div>
      <div class="steps">
        <div class="step-dot ${draft.step >= 1 ? 'active' : ''} ${draft.step > 1 ? 'done' : ''}"></div>
        <div class="step-dot ${draft.step >= 2 ? 'active' : ''} ${draft.step > 2 ? 'done' : ''}"></div>
        <div class="step-dot ${draft.step >= 3 ? 'active' : ''}"></div>
      </div>
      ${draft.step === 1 ? step1Html() : ''}
      ${draft.step === 2 ? step2Html() : ''}
      ${draft.step === 3 ? step3Html() : ''}
    </div>
  `;
  bindStep();
}

// ─── STEP 1 — Wallet ───────────────────────────────────────────────────────
function step1Html() {
  return `
    <div class="setup-card">
      <h2>1. Wallet</h2>
      <p>Choisissez la méthode pour configurer un wallet de trading dédié à Hyperliquid.</p>
      <div class="choice-row">
        <button class="choice-btn" id="btn-create" type="button">
          <div class="title">Créer</div>
          <div class="desc">Nouveau wallet aléatoire</div>
        </button>
        <button class="choice-btn" id="btn-import" type="button">
          <div class="title">Importer</div>
          <div class="desc">Clé privée existante</div>
        </button>
      </div>
      <div id="wallet-detail"></div>
    </div>
  `;
}

function step2Html() {
  return `
    <div class="setup-card">
      <h2>2. Réseau</h2>
      <p>Le testnet est offert pour tester sans risque. Le mainnet engage des fonds réels.</p>
      <div class="network-row">
        <div class="network-pick testnet ${draft.network === 'testnet' ? 'selected' : ''}" data-net="testnet">
          <div class="title">TESTNET</div>
          <div class="desc">Recommandé · USDC fictif</div>
        </div>
        <div class="network-pick mainnet ${draft.network === 'mainnet' ? 'selected' : ''}" data-net="mainnet">
          <div class="title">MAINNET</div>
          <div class="desc">Fonds réels · LIVE</div>
        </div>
      </div>
      <a class="faucet-link" href="https://app.hyperliquid-testnet.xyz/drip" target="_blank" rel="noreferrer">
        FAUCET TESTNET → 1 000 USDC
      </a>
      <p class="muted" style="font-size:10px">Pour activer un compte HL, un dépôt USDC sur le mainnet est nécessaire au préalable.</p>
      <div class="action-row">
        <button class="btn" id="back-1" type="button">Retour</button>
        <button class="btn btn-primary" id="next-2" type="button">Suivant</button>
      </div>
    </div>
  `;
}

function step3Html() {
  return `
    <div class="setup-card">
      <h2>3. Connexion</h2>
      <p>Test de connexion à <strong>${draft.network === 'mainnet' ? 'api.hyperliquid.xyz' : 'api.hyperliquid-testnet.xyz'}</strong>.</p>
      <div id="ping-area" class="test-status">
        <div class="spinner"></div>
        <div class="msg">Connexion en cours…</div>
      </div>
      <div class="action-row hidden" id="retry-row">
        <button class="btn" id="back-2" type="button">Retour</button>
        <button class="btn btn-primary" id="retry" type="button">Réessayer</button>
      </div>
    </div>
  `;
}

// ─── Bind handlers per step ────────────────────────────────────────────────
function bindStep() {
  if (draft.step === 1) bindStep1();
  else if (draft.step === 2) bindStep2();
  else if (draft.step === 3) bindStep3();
}

function bindStep1() {
  document.getElementById('btn-create').onclick = () => {
    const w = generateWallet();
    draft.privateKey = w.privateKey;
    draft.address = w.address;
    draft.acknowledged = false;
    document.getElementById('wallet-detail').innerHTML = `
      <div class="pk-warning">⚠ Notez cette clé hors-ligne. Elle ne sera plus jamais affichée.</div>
      <div class="label">Adresse</div>
      <div class="pk-display">${w.address}</div>
      <div class="label">Clé privée</div>
      <div class="pk-display" style="border-color:var(--red)">${w.privateKey}</div>
      <label class="checkbox-row">
        <input type="checkbox" id="ack-saved">
        <span>J'ai sauvegardé la clé privée dans un endroit sûr.</span>
      </label>
      <div class="action-row">
        <button class="btn btn-primary" id="next-1" type="button" disabled>Suivant</button>
      </div>
    `;
    const ack = document.getElementById('ack-saved');
    const next = document.getElementById('next-1');
    ack.onchange = () => {
      draft.acknowledged = ack.checked;
      next.disabled = !ack.checked;
    };
    next.onclick = () => goToStep(2);
  };

  document.getElementById('btn-import').onclick = () => {
    document.getElementById('wallet-detail').innerHTML = `
      <div class="label">Clé privée (hex 64 caractères)</div>
      <input class="input" id="pk-input" type="password" placeholder="0x..." autocomplete="off">
      <label class="checkbox-row">
        <input type="checkbox" id="show-pk"><span>Afficher la clé</span>
      </label>
      <div class="action-row">
        <button class="btn btn-primary" id="next-1" type="button">Valider</button>
      </div>
    `;
    const input = document.getElementById('pk-input');
    document.getElementById('show-pk').onchange = (e) => {
      input.type = e.target.checked ? 'text' : 'password';
    };
    document.getElementById('next-1').onclick = () => {
      let pk = (input.value || '').trim();
      if (!pk) return toast('Clé privée requise', 'error');
      if (!pk.startsWith('0x')) pk = '0x' + pk;
      try {
        const addr = addressFromPrivateKey(pk);
        draft.privateKey = pk;
        draft.address = addr;
        draft.acknowledged = true;
        toast(`Wallet ${addr.slice(0, 10)}…`, 'success');
        goToStep(2);
      } catch (e) {
        toast('Clé privée invalide', 'error');
      }
    };
  };
}

function bindStep2() {
  document.querySelectorAll('.network-pick').forEach((el) => {
    el.onclick = () => {
      draft.network = el.dataset.net;
      if (draft.network === 'mainnet') {
        if (!confirm('MAINNET engage des fonds réels. Continuer ?')) {
          draft.network = 'testnet';
        }
      }
      render();
    };
  });
  document.getElementById('back-1').onclick = () => goToStep(1);
  document.getElementById('next-2').onclick = () => goToStep(3);
}

function bindStep3() {
  runPing();
  document.getElementById('back-2')?.addEventListener('click', () => goToStep(2));
  document.getElementById('retry')?.addEventListener('click', runPing);
}

async function runPing() {
  const area = document.getElementById('ping-area');
  area.className = 'test-status';
  area.innerHTML = `<div class="spinner"></div><div class="msg">Connexion en cours…</div>`;
  document.getElementById('retry-row').classList.add('hidden');

  try {
    const ex = new HLExchange(draft.privateKey, draft.network);
    const ok = await ex.ping();
    if (!ok) throw new Error('aucune donnée');

    // Save everything and start the bot
    const config = { ...DEFAULT_CONFIG, network: draft.network };
    await Storage.saveWallet(draft.privateKey, draft.address);
    await Storage.saveConfig(config);
    await requestPermission();

    area.className = 'test-status success';
    area.innerHTML = `<div class="msg">✓ CONNECTÉ</div>`;
    toast('Connexion OK', 'success');

    setTimeout(async () => {
      showScreen('dashboard');
      await startBot();
    }, 600);
  } catch (err) {
    area.className = 'test-status error';
    area.innerHTML = `<div class="msg">✗ ÉCHEC</div><div style="font-size:10px;color:var(--text2)">${err.message}</div>`;
    document.getElementById('retry-row').classList.remove('hidden');
  }
}

function goToStep(n) {
  draft.step = n;
  render();
}
