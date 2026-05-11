// Wrapper for the native BotService plugin (Android foreground service).
// No-op when running outside Capacitor (e.g. desktop browser tests).

const Plugins = (typeof window !== 'undefined' && window.Capacitor?.Plugins) || {};
const Bot = Plugins.BotService;

export async function startForegroundService() {
  if (!Bot) return;
  try {
    await Bot.start();
  } catch (e) {
    console.warn('[foreground] start failed:', e);
  }
}

export async function stopForegroundService() {
  if (!Bot) return;
  try {
    await Bot.stop();
  } catch (e) {
    console.warn('[foreground] stop failed:', e);
  }
}
