/**
 * Geopolitik — Application principale
 */

import { Nation, SECTORS, generateCountryName } from "./nation.js";
import { World, POWERS } from "./world.js";
import { DOCTRINES, getDoctrine, isDoctrineUnlocked, switchDoctrine } from "./doctrine.js";
import { EventEngine } from "./events.js";
import { ProgressionTracker, ACHIEVEMENTS, TIERS, getTier, getNextTier } from "./progression.js";
import { InfluenceChart } from "./chart.js";
import {
  saveGame, loadGame, deleteSave, getOfflineTicks, mulberry32,
  formatDate, formatNumber, formatTreasury, formatRelation
} from "./save.js";

const TICK_INTERVAL_MS = 2000; // 1 mois en jeu = 2s
const SAVE_INTERVAL_MS = 10000;

class App {
  constructor() {
    this.state = null;
    this.chart = null;
    this.tickHandle = null;
    this.saveHandle = null;
    this.rng = null;
  }

  init() {
    this.bindEls();
    this.loadOrCreate();
    this.processOfflineTime();
    this.bindEvents();
    this.startGameLoop();
    this.render();
    this.maybeOnboarding();
  }

  bindEls() {
    this.el = {
      // Header
      countryName: document.getElementById("country-name"),
      gameDate: document.getElementById("game-date"),
      tierBadge: document.getElementById("tier-badge"),
      doctrineBadge: document.getElementById("doctrine-badge"),
      influenceValue: document.getElementById("influence-value"),
      influenceDelta: document.getElementById("influence-delta"),
      tierProgressBar: document.getElementById("tier-progress-bar"),
      tierProgressLabel: document.getElementById("tier-progress-label"),
      treasuryValue: document.getElementById("treasury-value"),
      stabilityValue: document.getElementById("stability-value"),
      tensionValue: document.getElementById("tension-value"),

      // Tabs
      tabs: {
        nation: document.getElementById("tab-nation"),
        world: document.getElementById("tab-world"),
        doctrine: document.getElementById("tab-doctrine"),
        events: document.getElementById("tab-events"),
        achievements: document.getElementById("tab-achievements")
      },
      panels: {
        nation: document.getElementById("panel-nation"),
        world: document.getElementById("panel-world"),
        doctrine: document.getElementById("panel-doctrine"),
        events: document.getElementById("panel-events"),
        achievements: document.getElementById("panel-achievements")
      },

      // Nation panel
      sectorList: document.getElementById("sector-list"),
      chartCanvas: document.getElementById("chart-canvas"),
      allocationLockHint: document.getElementById("allocation-lock-hint"),

      // World panel
      powerList: document.getElementById("power-list"),

      // Doctrine panel
      doctrineList: document.getElementById("doctrine-list"),

      // Events panel
      activeEvents: document.getElementById("active-events"),
      eventsHistory: document.getElementById("events-history"),

      // Achievements
      achievementList: document.getElementById("achievement-list"),

      // Modals
      eventBanner: document.getElementById("event-banner"),
      notifs: document.getElementById("notifs"),
      onboardingModal: document.getElementById("onboarding-modal"),
      offlineModal: document.getElementById("offline-modal"),
      diplomacyModal: document.getElementById("diplomacy-modal"),
      diplomacyTitle: document.getElementById("diplomacy-title"),
      diplomacyBody: document.getElementById("diplomacy-body"),

      // Reset
      btnReset: document.getElementById("btn-reset")
    };

    this._lastInfluence = 0;
    this._eventLog = [];
  }

  loadOrCreate() {
    const saved = loadGame();
    if (saved) {
      this.state = {
        nation: Nation.deserialize(saved.nation),
        world: World.deserialize(saved.world),
        events: EventEngine.deserialize(saved.events),
        progression: ProgressionTracker.deserialize(saved.progression),
        savedAt: saved.savedAt,
        seed: saved.seed
      };
    } else {
      const seed = Math.floor(Math.random() * 1e9);
      this.state = {
        nation: new Nation(),
        world: new World(),
        events: new EventEngine(),
        progression: new ProgressionTracker(),
        savedAt: Date.now(),
        seed
      };
    }
    // Initialize RNG (déterministe par seed + tick courant — re-créé à chaque load)
    const tickOffset = this.state.nation.history.length;
    this.rng = mulberry32((this.state.seed ^ tickOffset) >>> 0);
  }

  processOfflineTime() {
    if (!this.state.savedAt) return;
    const offlineTicks = getOfflineTicks(this.state.savedAt, TICK_INTERVAL_MS);
    if (offlineTicks < 5) return;

    const before = this.state.nation.influenceScore();
    const cappedTicks = Math.min(offlineTicks, 21600);
    const doctrineDef = getDoctrine(this.state.nation.doctrine);

    for (let i = 0; i < cappedTicks; i++) {
      this.state.nation.tick(this.rng, doctrineDef);
      this.state.world.tick(this.rng, this.state.nation.doctrine);
      this.state.events.tick(this.state.nation, this.state.world, this.rng, doctrineDef);
      this.state.progression.update(this.state.nation, this.state.world, this.state.events);
    }
    const after = this.state.nation.influenceScore();

    setTimeout(() => {
      this.showOfflineModal(after - before, (offlineTicks * TICK_INTERVAL_MS) / 3600000);
    }, 600);
  }

  showOfflineModal(delta, hours) {
    document.getElementById("offline-delta").textContent = (delta >= 0 ? "+" : "") + delta;
    document.getElementById("offline-delta").className = "offline-delta " + (delta >= 0 ? "positive" : "negative");
    document.getElementById("offline-hours").textContent = hours.toFixed(1);
    document.getElementById("offline-date").textContent = formatDate(this.state.nation.year, this.state.nation.month);
    this.el.offlineModal.classList.add("visible");
  }

  bindEvents() {
    // Tabs
    for (const [name, btn] of Object.entries(this.el.tabs)) {
      btn.addEventListener("click", () => this.switchTab(name));
    }

    // Modal closes
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-close-modal");
        document.getElementById(id).classList.remove("visible");
      });
    });

    // Reset
    this.el.btnReset.addEventListener("click", () => {
      if (confirm("Tout réinitialiser ? Cette action est irréversible.")) {
        deleteSave();
        location.reload();
      }
    });

    // Resize chart
    window.addEventListener("resize", () => { if (this.chart) this.chart.resize(); });

    // Save on backgrounding
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.persist();
    });
  }

  startGameLoop() {
    this.tickHandle = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.saveHandle = setInterval(() => this.persist(), SAVE_INTERVAL_MS);
  }

  // ============================================================
  // GAME LOOP
  // ============================================================

  tick() {
    const { nation, world, events, progression } = this.state;
    const doctrineDef = getDoctrine(nation.doctrine);

    // Nation tick
    const nResult = nation.tick(this.rng, doctrineDef);

    // World tick
    world.tick(this.rng, nation.doctrine);

    // Events
    const newEvent = events.tick(nation, world, this.rng, doctrineDef);
    if (newEvent) {
      this.showEventBanner(newEvent);
      this._eventLog.unshift({ ...newEvent, year: nation.year, month: nation.month });
      if (this._eventLog.length > 30) this._eventLog.pop();
      this.pushNotif({
        type: newEvent.severity === "good" ? "good" : newEvent.severity === "bad" ? "bad" : "neutral",
        text: newEvent.headline
      });
      // Survive crisis
      if (newEvent.severity === "bad") {
        setTimeout(() => {
          if (nation.stability > 30) progression.recordCrisisSurvived();
        }, 1000);
      }
    }

    // Progression update
    progression.update(nation, world, events);
    const newAchievements = progression.checkAchievements();
    for (const ach of newAchievements) {
      if (ach.reward.treasury) nation.treasury += ach.reward.treasury;
      this.pushNotif({ type: "achievement", text: `🏆 ${ach.name} (+${ach.reward.treasury}M$)` });
    }

    this.render();
  }

  // ============================================================
  // RENDER
  // ============================================================

  render() {
    this.renderHeader();
    this.renderActivePanel();
  }

  renderActivePanel() {
    const active = Object.keys(this.el.panels).find(k => this.el.panels[k].classList.contains("active"));
    if (active === "nation") this.renderNationPanel();
    if (active === "world") this.renderWorldPanel();
    if (active === "doctrine") this.renderDoctrinePanel();
    if (active === "events") this.renderEventsPanel();
    if (active === "achievements") this.renderAchievements();
  }

  renderHeader() {
    const { nation, world, progression } = this.state;
    const inf = nation.influenceScore();
    const tier = getTier(inf);
    const next = getNextTier(inf);
    const doctrineDef = getDoctrine(nation.doctrine);

    this.el.countryName.textContent = nation.name;
    this.el.gameDate.textContent = formatDate(nation.year, nation.month);
    this.el.tierBadge.textContent = tier.name;
    this.el.doctrineBadge.textContent = `${doctrineDef.icon} ${doctrineDef.name}`;
    this.el.doctrineBadge.style.borderColor = doctrineDef.color;
    this.el.doctrineBadge.style.color = doctrineDef.color;

    this.el.influenceValue.textContent = inf.toLocaleString("fr-FR");
    const delta = inf - this._lastInfluence;
    if (this._lastInfluence > 0) {
      this.el.influenceDelta.textContent = (delta >= 0 ? "▲ +" : "▼ ") + Math.abs(delta).toFixed(0);
      this.el.influenceDelta.className = "influence-delta " + (delta >= 0 ? "positive" : "negative");
    }
    this._lastInfluence = inf;

    if (next) {
      const span = next.minInfluence - tier.minInfluence;
      const filled = (inf - tier.minInfluence) / span;
      this.el.tierProgressBar.style.width = `${Math.min(100, Math.max(0, filled * 100))}%`;
      this.el.tierProgressLabel.textContent = `${inf} → ${next.minInfluence} (${next.name})`;
    } else {
      this.el.tierProgressBar.style.width = "100%";
      this.el.tierProgressLabel.textContent = "Tier maximum";
    }

    this.el.treasuryValue.textContent = formatTreasury(nation.treasury);
    this.el.stabilityValue.textContent = `${Math.round(nation.stability)}`;
    this.el.stabilityValue.className = "kpi-value " + (nation.stability >= 70 ? "positive" : nation.stability >= 40 ? "neutral" : "negative");
    this.el.tensionValue.textContent = `${Math.round(world.tension)}`;
    this.el.tensionValue.className = "kpi-value " + (world.tension <= 40 ? "positive" : world.tension <= 70 ? "neutral" : "negative");
  }

  renderNationPanel() {
    const { nation } = this.state;

    // Sectors with allocation
    this.el.sectorList.innerHTML = "";
    for (const [id, def] of Object.entries(SECTORS)) {
      const value = nation[id.toLowerCase()];
      const alloc = nation.allocation[id] || 0;
      const row = document.createElement("div");
      row.className = "sector-row";
      row.style.setProperty("--sector-color", def.color);
      row.innerHTML = `
        <div class="sector-header">
          <div class="sector-meta">
            <span class="sector-icon">${def.icon}</span>
            <span class="sector-name">${def.name}</span>
          </div>
          <div class="sector-value">${formatNumber(value, 0)}</div>
        </div>
        <div class="sector-alloc-row">
          <input type="range" class="sector-slider" min="0" max="100" step="1" value="${Math.round(alloc * 100)}" data-sector="${id}">
          <span class="sector-alloc-label">${Math.round(alloc * 100)}%</span>
        </div>
      `;
      const slider = row.querySelector(".sector-slider");
      const label = row.querySelector(".sector-alloc-label");
      slider.addEventListener("input", () => {
        label.textContent = `${slider.value}%`;
      });
      slider.addEventListener("change", () => {
        nation.setAllocation(id, parseFloat(slider.value) / 100);
        this.pushNotif({ type: "neutral", text: `Budget ${def.name}: ${slider.value}%` });
        this.renderNationPanel();
      });
      this.el.sectorList.appendChild(row);
    }

    // Chart
    if (!this.chart) {
      this.chart = new InfluenceChart(this.el.chartCanvas);
    }
    const next = getNextTier(nation.influenceScore());
    this.chart.draw(nation.history, next ? next.minInfluence : null);
  }

  renderWorldPanel() {
    const { world } = this.state;
    this.el.powerList.innerHTML = "";

    const powerEntries = Object.entries(POWERS).sort((a, b) =>
      world.powerInfluence[b[0]] - world.powerInfluence[a[0]]
    );

    for (const [id, p] of powerEntries) {
      const rel = world.relations[id];
      const relInfo = formatRelation(rel);
      const inf = Math.round(world.powerInfluence[id]);
      const card = document.createElement("div");
      card.className = "power-card";
      card.innerHTML = `
        <div class="power-flag">${p.flag}</div>
        <div class="power-meta">
          <div class="power-name">${p.name}</div>
          <div class="power-influence">Influence: ${formatNumber(inf)}</div>
        </div>
        <div class="power-rel ${relInfo.className}">
          <div class="rel-label">${relInfo.label}</div>
          <div class="rel-value">${rel >= 0 ? "+" : ""}${Math.round(rel)}</div>
        </div>
      `;
      card.addEventListener("click", () => this.openDiplomacyModal(id));
      this.el.powerList.appendChild(card);
    }
  }

  renderDoctrinePanel() {
    const { nation, progression } = this.state;
    const tier = getTier(progression.maxInfluence).tier;
    this.el.doctrineList.innerHTML = "";

    for (const [id, def] of Object.entries(DOCTRINES)) {
      const isActive = nation.doctrine === id;
      const unlocked = isDoctrineUnlocked(id, tier);
      const card = document.createElement("div");
      card.className = "doctrine-card" + (isActive ? " active" : "") + (!unlocked ? " locked" : "");
      card.style.setProperty("--doctrine-color", def.color);

      const mults = Object.entries(def.multipliers)
        .map(([k, v]) => {
          const sectorIcon = SECTORS[k]?.icon || "";
          const pct = Math.round((v - 1) * 100);
          const sign = pct >= 0 ? "+" : "";
          const cls = pct >= 0 ? "pos" : "neg";
          return `<span class="mult ${cls}">${sectorIcon} ${sign}${pct}%</span>`;
        }).join("");

      card.innerHTML = `
        <div class="doctrine-icon">${def.icon}</div>
        <div class="doctrine-content">
          <div class="doctrine-name">${def.name}</div>
          <div class="doctrine-desc">${def.description}</div>
          <div class="doctrine-mults">${mults}</div>
        </div>
        <div class="doctrine-action">
          ${isActive
            ? '<span class="doctrine-active-tag">ACTIVE</span>'
            : unlocked
              ? `<button class="btn-doctrine-switch">Adopter</button>`
              : `<span class="doctrine-locked-tag">Tier ${def.unlockTier}+</span>`}
        </div>
      `;

      const btn = card.querySelector(".btn-doctrine-switch");
      if (btn) {
        btn.addEventListener("click", () => this.handleDoctrineSwitch(id));
      }
      this.el.doctrineList.appendChild(card);
    }

    // Cooldown hint
    if (nation.doctrineSwitchCooldown > 0) {
      const hint = document.createElement("div");
      hint.className = "doctrine-cooldown";
      hint.textContent = `Transition en cours — ${nation.doctrineSwitchCooldown} mois restants. Stabilité fragilisée.`;
      this.el.doctrineList.prepend(hint);
    }
  }

  renderEventsPanel() {
    // Active events
    this.el.activeEvents.innerHTML = "";
    const active = this.state.events.activeEvents;
    if (active.length === 0) {
      this.el.activeEvents.innerHTML = '<div class="empty-state">Aucun événement actif</div>';
    }
    for (const ev of active) {
      const card = document.createElement("div");
      card.className = "event-card active sev-" + ev.severity;
      const progress = 100 * (1 - ev.ticksLeft / ev.duration);
      card.innerHTML = `
        <div class="event-headline">${ev.headline}</div>
        <div class="event-desc">${ev.description}</div>
        <div class="event-meta">
          <span>${ev.ticksLeft} mois restants</span>
        </div>
        <div class="event-progress"><div class="event-progress-bar" style="width:${progress}%"></div></div>
      `;
      this.el.activeEvents.appendChild(card);
    }

    // History
    this.el.eventsHistory.innerHTML = "";
    if (this._eventLog.length === 0) {
      this.el.eventsHistory.innerHTML = '<div class="empty-state">Pas encore d\'événements enregistrés</div>';
    }
    for (const ev of this._eventLog) {
      const card = document.createElement("div");
      card.className = "event-card history sev-" + ev.severity;
      card.innerHTML = `
        <div class="event-date">${formatDate(ev.year, ev.month)}</div>
        <div class="event-headline">${ev.headline}</div>
      `;
      this.el.eventsHistory.appendChild(card);
    }
  }

  renderAchievements() {
    const { progression } = this.state;
    this.el.achievementList.innerHTML = "";
    for (const ach of ACHIEVEMENTS) {
      const unlocked = progression.achievementsUnlocked.has(ach.id);
      const card = document.createElement("div");
      card.className = "ach-card" + (unlocked ? " unlocked" : "");
      card.innerHTML = `
        <div class="ach-icon">${unlocked ? "🏆" : "🔒"}</div>
        <div class="ach-content">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.description}</div>
        </div>
        <div class="ach-reward">+${ach.reward.treasury}M$</div>
      `;
      this.el.achievementList.appendChild(card);
    }
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  switchTab(name) {
    for (const t of Object.values(this.el.tabs)) t.classList.remove("active");
    for (const p of Object.values(this.el.panels)) p.classList.remove("active");
    this.el.tabs[name].classList.add("active");
    this.el.panels[name].classList.add("active");
    this.renderActivePanel();
  }

  handleDoctrineSwitch(newDoctrineId) {
    const { nation, progression } = this.state;
    const tier = getTier(progression.maxInfluence).tier;
    const def = getDoctrine(newDoctrineId);

    if (!confirm(`Adopter ${def.name} ?\nCela coûtera 20 points de stabilité et 12 mois de cooldown.`)) return;

    const result = switchDoctrine(nation, newDoctrineId, tier);
    if (result.ok) {
      progression.recordDoctrineChange();
      this.pushNotif({ type: "neutral", text: `${def.icon} ${def.name} adoptée — transition de 12 mois` });
      this.persist();
      this.renderDoctrinePanel();
      this.renderHeader();
    } else {
      const msgs = {
        locked: "Doctrine verrouillée",
        same_doctrine: "Vous avez déjà cette doctrine",
        cooldown: `Transition en cours (${result.remaining} mois restants)`
      };
      this.pushNotif({ type: "bad", text: msgs[result.error] || "Action impossible" });
    }
  }

  openDiplomacyModal(powerId) {
    const { nation, world } = this.state;
    const power = POWERS[powerId];
    const rel = world.relations[powerId];
    const relInfo = formatRelation(rel);

    this.el.diplomacyTitle.textContent = `${power.flag} ${power.name}`;
    this.el.diplomacyBody.innerHTML = `
      <div class="diplo-info">
        <div class="diplo-row">
          <span>Relation</span>
          <strong class="${relInfo.className}">${relInfo.label} (${rel >= 0 ? "+" : ""}${Math.round(rel)})</strong>
        </div>
        <div class="diplo-row">
          <span>Influence</span>
          <strong>${formatNumber(Math.round(world.powerInfluence[powerId]))}</strong>
        </div>
        <div class="diplo-row">
          <span>Régime</span>
          <strong>${power.archetype}</strong>
        </div>
        <div class="diplo-row">
          <span>Votre Diplomatie</span>
          <strong>${Math.round(nation.diplomacy)}</strong>
        </div>
      </div>
      <div class="diplo-actions">
        <button class="btn-diplo" data-action="summit">
          🤝 Sommet (15 diplo) <span>+8 à +12</span>
        </button>
        <button class="btn-diplo" data-action="alliance">
          🌐 Proposer alliance (30 diplo) <span>+15 à +25</span>
        </button>
        <button class="btn-diplo bad" data-action="rebuke">
          ⚔️ Réprimander (5 diplo) <span>−12 à −18</span>
        </button>
      </div>
    `;
    this.el.diplomacyBody.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.executeDiplomacy(powerId, btn.getAttribute("data-action"));
      });
    });
    this.el.diplomacyModal.classList.add("visible");
  }

  executeDiplomacy(powerId, action) {
    const { nation, world } = this.state;
    const result = world.diplomaticAction(powerId, nation, action);
    if (result.ok) {
      const power = POWERS[powerId];
      this.pushNotif({
        type: result.delta >= 0 ? "good" : "bad",
        text: `${power.flag} ${power.name}: ${result.delta >= 0 ? "+" : ""}${result.delta.toFixed(0)} relation`
      });
      this.el.diplomacyModal.classList.remove("visible");
      this.persist();
      this.render();
    } else {
      this.pushNotif({ type: "bad", text: "Diplomatie insuffisante" });
    }
  }

  // ============================================================
  // NOTIFICATIONS / EVENTS
  // ============================================================

  pushNotif({ type, text }) {
    const el = document.createElement("div");
    el.className = `notif notif-${type}`;
    el.textContent = text;
    this.el.notifs.appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    setTimeout(() => {
      el.classList.remove("visible");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  showEventBanner(event) {
    this.el.eventBanner.textContent = event.headline;
    this.el.eventBanner.className = "event-banner visible " +
      (event.severity === "good" ? "good" : event.severity === "bad" ? "bad" : "neutral");
    setTimeout(() => this.el.eventBanner.classList.remove("visible"), 6000);
  }

  // ============================================================
  // PERSISTENCE / ONBOARDING
  // ============================================================

  persist() {
    saveGame(this.state);
  }

  maybeOnboarding() {
    if (!localStorage.getItem("geopolitik.seenOnboarding")) {
      document.getElementById("onb-country-name").textContent = this.state.nation.name;
      this.el.onboardingModal.classList.add("visible");
      localStorage.setItem("geopolitik.seenOnboarding", "1");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
  window.__app = app;
});
