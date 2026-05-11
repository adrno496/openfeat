import { initRouter } from './router.js';
import { applyTheme } from './state.js';
import { loadOpenRouterModels } from './providers/index.js';

applyTheme();
loadOpenRouterModels(); // background fetch — does not block UI
initRouter();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
