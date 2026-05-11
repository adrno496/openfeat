import { HomeView } from './views/HomeView.js';
import { LobbyView } from './views/LobbyView.js';
import { GameView } from './views/GameView.js';
import { SettingsView } from './views/SettingsView.js';

const ROUTES = {
  home: HomeView,
  lobby: LobbyView,
  game: GameView,
  settings: SettingsView
};

let currentParams = {};

export function navigate(route, params = {}) {
  currentParams = params;
  const url = `#/${route}`;
  if (location.hash !== url) {
    history.pushState({ route, params }, '', url);
  }
  render();
}

function render() {
  const root = document.getElementById('app');
  const hash = location.hash.replace(/^#\//, '') || 'home';
  const View = ROUTES[hash] || HomeView;
  root.innerHTML = '';
  root.appendChild(buildHeader(hash));
  const main = document.createElement('main');
  main.className = 'view' + (hash === 'game' ? '' : '');
  root.appendChild(main);
  View(main, currentParams);
}

function buildHeader(currentRoute) {
  const h = document.createElement('header');
  h.className = 'app-header';
  h.innerHTML = `
    <div class="logo" id="goHome"><span class="red">A</span>I <span class="blue">A</span>RENA</div>
    <div class="header-actions">
      <button class="icon-btn" id="goSettings" title="Réglages">⚙️</button>
    </div>
  `;
  h.querySelector('#goHome').onclick = () => navigate('home');
  h.querySelector('#goSettings').onclick = () => navigate('settings');
  return h;
}

export function initRouter() {
  window.addEventListener('popstate', (e) => {
    currentParams = (e.state && e.state.params) || {};
    render();
  });
  render();
}
