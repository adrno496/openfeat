// Local notification wrapper. Uses @capacitor/local-notifications when available,
// falls back to no-op in the browser.

const HAS_CAP = typeof window !== 'undefined' &&
  window.Capacitor?.isPluginAvailable?.('LocalNotifications');

const Plugin = HAS_CAP ? window.Capacitor.Plugins.LocalNotifications : null;

let nextId = 1;

export async function requestPermission() {
  if (!Plugin) return false;
  try {
    const perm = await Plugin.requestPermissions();
    return perm.display === 'granted';
  } catch {
    return false;
  }
}

export async function notify(title, body) {
  if (!Plugin) {
    console.log(`[notif] ${title} — ${body}`);
    return;
  }
  try {
    await Plugin.schedule({
      notifications: [{
        id: nextId++,
        title,
        body,
        schedule: { at: new Date(Date.now() + 100) },
        smallIcon: 'ic_stat_notify',
        iconColor: '#00D4FF',
      }],
    });
  } catch (err) {
    console.warn('notify failed:', err);
  }
}
