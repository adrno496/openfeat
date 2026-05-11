// Bottom navigation wiring + haptic feedback.
import { showScreen } from '../app.js';

const HAS_HAPTICS = typeof window !== 'undefined' &&
  window.Capacitor?.isPluginAvailable?.('Haptics');
const Haptics = HAS_HAPTICS ? window.Capacitor.Plugins.Haptics : null;

export function initNav() {
  const buttons = document.querySelectorAll('#bottom-nav .nav-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (Haptics) Haptics.impact({ style: 'Light' }).catch(() => {});
      showScreen(screen);
    });
  });
}
