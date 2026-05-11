// HL TRADER — bootstrap. Singleton AppState + screen routing.
import { Storage, DEFAULT_CONFIG } from './core/storage.js';
import { TradingBot } from './core/bot.js';
import { initNav } from './ui/nav.js';
import { toast } from './ui/toast.js';
import { initSetupScreen } from './screens/setup.js';
import { initDashboardScreen } from './screens/dashboard.js';
import { initPositionsScreen } from './screens/positions.js';
import { initSignalsScreen } from './screens/signals.js';
import { initSettingsScreen } from './screens/settings.js';

export const AppState = {
  bot: null,
  botState: null,
  config: null,
  wallet: null,
};

let booted = false;

async function boot() {
  if (booted) return;
  booted = true;

  try {
    AppState.wallet = await Storage.getWallet();
    AppState.config = (await Storage.getConfig()) || DEFAULT_CONFIG;
  } catch (e) {
    console.error('boot: storage error', e);
    AppState.config = DEFAULT_CONFIG;
  }

  initNav();
  initSetupScreen();
  initDashboardScreen();
  initPositionsScreen();
  initSignalsScreen();
  initSettingsScreen();

  // Status bar (Capacitor only)
  configureStatusBar();

  if (!AppState.wallet) {
    showScreen('setup');
  } else {
    showScreen('dashboard');
    startBot().catch((e) => {
      console.error('boot: bot start failed', e);
      toast(`Démarrage bot échoué: ${e.message}`, 'error');
    });
  }

  document.dispatchEvent(new CustomEvent('app-config-loaded', { detail: AppState.config }));
}

async function configureStatusBar() {
  if (typeof window === 'undefined') return;
  if (!window.Capacitor?.isPluginAvailable?.('StatusBar')) return;
  try {
    const { StatusBar, Style } = window.Capacitor.Plugins;
    await StatusBar.setStyle({ style: 'DARK' });
    await StatusBar.setBackgroundColor({ color: '#080C10' });
  } catch {}
}

export async function startBot() {
  if (AppState.bot?.state?.running) return AppState.bot;
  if (!AppState.bot) {
    AppState.bot = new TradingBot();
    AppState.bot.onStateChange = (state) => {
      AppState.botState = state;
      document.dispatchEvent(new CustomEvent('bot-update', { detail: state }));
    };
  }
  await AppState.bot.start();
  return AppState.bot;
}

export async function restartBot() {
  if (AppState.bot) {
    AppState.bot.stop();
    AppState.bot = null;
  }
  await startBot();
}

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.toggle('hidden', name === 'setup');

  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
}

// Capacitor's deviceready fires once on Android. Browser fallback boots immediately.
document.addEventListener('deviceready', boot, false);
if (typeof window !== 'undefined' && (!window.Capacitor || window.Capacitor.platform === 'web')) {
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
}
