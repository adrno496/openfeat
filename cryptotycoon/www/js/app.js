/**
 * Crypto Trader Tycoon — Main application
 */

import { Market, ASSETS, REGIMES } from "./market.js";
import { Portfolio } from "./portfolio.js";
import { BotManager, BOT_TYPES } from "./bots.js";
import { EventEngine } from "./events.js";
import { ProgressionTracker, ACHIEVEMENTS, getTier, getNextTier, TIERS } from "./progression.js";
import { PriceChart } from "./chart.js";
import { saveGame, loadGame, deleteSave, getOfflineTicks, formatUSD, formatPrice, formatUnits, formatPct } from "./save.js";

const TICK_INTERVAL_MS = 2000;
const SAVE_INTERVAL_MS = 10000;

class App {
  constructor() {
    this.state = null;
    this.selectedAsset = "BTC";
    this.chart = null;
    this.tickInterval = null;
    this.saveInterval = null;
    this.notifications = [];
  }

  init() {
    this.bindStaticEls();
    this.loadOrCreate();
    this.processOfflineTime();
    this.bindEvents();
    this.startGameLoop();
    this.render();
    this.maybeShowOnboarding();
  }

  bindStaticEls() {
    this.el = {
      portfolioValue: document.getElementById("portfolio-value"),
      portfolioCash: document.getElementById("portfolio-cash"),
      portfolioPnl: document.getElementById("portfolio-pnl"),
      tierBadge: document.getElementById("tier-badge"),
      tierProgressBar: document.getElementById("tier-progress-bar"),
      tierProgressLabel: document.getElementById("tier-progress-label"),
      regimeBadge: document.getElementById("regime-badge"),
      assetList: document.getElementById("asset-list"),
      chartCanvas: document.getElementById("chart-canvas"),
      chartSymbol: document.getElementById("chart-symbol"),
      chartPrice: document.getElementById("chart-price"),
      chartChange: document.getElementById("chart-change"),
      chartHolding: document.getElementById("chart-holding"),
      btnBuy: document.getElementById("btn-buy"),
      btnSell: document.getElementById("btn-sell"),
      botList: document.getElementById("bot-list"),
      notifsContainer: document.getElementById("notifs"),
      eventBanner: document.getElementById("event-banner"),
      btnTabMarket: document.getElementById("tab-market"),
      btnTabBots: document.getElementById("tab-bots"),
      btnTabAchievements: document.getElementById("tab-achievements"),
      panelMarket: document.getElementById("panel-market"),
      panelBots: document.getElementById("panel-bots"),
      panelAchievements: document.getElementById("panel-achievements"),
      achievementList: document.getElementById("achievement-list"),
      btnReset: document.getElementById("btn-reset"),
      tradeModal: document.getElementById("trade-modal"),
      tradeModalTitle: document.getElementById("trade-modal-title"),
      tradeModalSubtitle: document.getElementById("trade-modal-subtitle"),
      tradeModalAmount: document.getElementById("trade-amount"),
      tradeModalSlider: document.getElementById("trade-slider"),
      tradeModalUnits: document.getElementById("trade-units"),
      tradeModalConfirm: document.getElementById("trade-confirm"),
      tradeModalPresets: document.getElementById("trade-presets")
    };
  }

  loadOrCreate() {
    const saved = loadGame();
    if (saved) {
      this.state = {
        market: Market.deserialize(saved.market),
        portfolio: Portfolio.deserialize(saved.portfolio),
        bots: BotManager.deserialize(saved.bots),
        events: EventEngine.deserialize(saved.events),
        progression: ProgressionTracker.deserialize(saved.progression),
        savedAt: saved.savedAt
      };
    } else {
      this.state = {
        market: new Market(Math.floor(Math.random() * 1e9)),
        portfolio: new Portfolio(100),
        bots: new BotManager(),
        events: new EventEngine(),
        progression: new ProgressionTracker(),
        savedAt: Date.now()
      };
    }
  }

  processOfflineTime() {
    if (!this.state.savedAt) return;
    const offlineTicks = getOfflineTicks(this.state.savedAt, TICK_INTERVAL_MS);
    if (offlineTicks < 5) return; // ignore if less than 10 sec

    const before = this.state.portfolio.totalValue(this.state.market.prices);
    // Cap offline ticks pour éviter game-breaking
    const cappedTicks = Math.min(offlineTicks, 21600); // 12h * 3600/2 = 21600
    for (let i = 0; i < cappedTicks; i++) {
      this.state.market.advance(1);
      this.state.bots.tick(this.state.market, this.state.portfolio);
    }
    const after = this.state.portfolio.totalValue(this.state.market.prices);
    const gained = after - before;
    const hours = (offlineTicks * TICK_INTERVAL_MS) / 3600000;

    setTimeout(() => {
      this.showOfflineModal(gained, hours);
    }, 600);
  }

  showOfflineModal(gained, hours) {
    const modal = document.getElementById("offline-modal");
    document.getElementById("offline-gain").textContent = formatUSD(gained);
    document.getElementById("offline-gain").className = "offline-gain " + (gained >= 0 ? "positive" : "negative");
    document.getElementById("offline-time").textContent = hours.toFixed(1);
    modal.classList.add("visible");
  }

  bindEvents() {
    // Tab switcher
    this.el.btnTabMarket.addEventListener("click", () => this.switchTab("market"));
    this.el.btnTabBots.addEventListener("click", () => this.switchTab("bots"));
    this.el.btnTabAchievements.addEventListener("click", () => this.switchTab("achievements"));

    // Trade buttons
    this.el.btnBuy.addEventListener("click", () => this.openTradeModal("buy"));
    this.el.btnSell.addEventListener("click", () => this.openTradeModal("sell"));

    // Trade modal
    this.el.tradeModalSlider.addEventListener("input", () => this.updateTradePreview());
    this.el.tradeModalAmount.addEventListener("input", () => {
      this.syncSliderFromAmount();
      this.updateTradePreview();
    });
    this.el.tradeModalConfirm.addEventListener("click", () => this.confirmTrade());

    // Modal close buttons
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-close-modal");
        document.getElementById(id).classList.remove("visible");
      });
    });

    // Reset button
    this.el.btnReset.addEventListener("click", () => this.confirmReset());

    // Resize chart on window resize
    window.addEventListener("resize", () => {
      if (this.chart) this.chart.resize();
    });

    // Visibility — save on backgrounding
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.persist();
      }
    });
  }

  startGameLoop() {
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.saveInterval = setInterval(() => this.persist(), SAVE_INTERVAL_MS);
  }

  tick() {
    const { market, portfolio, bots, events, progression } = this.state;

    // 1) Advance market
    const marketChanges = market.advance(1);

    // 2) Trigger random events
    const newEvent = events.tick(market, market.rand);
    if (newEvent) {
      this.showEventBanner(newEvent);
      this.pushNotif({
        type: newEvent.severity === "good" ? "good" : (newEvent.severity === "bad" || newEvent.severity === "catastrophic") ? "bad" : "neutral",
        text: newEvent.headline
      });
      progression.recordEvent(newEvent);
    }

    // 3) Bot actions
    const botEvents = bots.tick(market, portfolio);
    for (const ev of botEvents) {
      if (ev.action === "buy") {
        progression.recordTrade({ market, type: "buy" });
      } else if (ev.action === "sell") {
        progression.recordTrade({ market, type: "sell" });
        if (ev.pnl !== undefined && Math.abs(ev.pnl) > 1) {
          // Optional: notification on big bot pnl
        }
      }
    }

    // 4) Notify regime changes
    for (const ch of marketChanges) {
      if (ch.type === "regime") {
        this.pushNotif({
          type: ch.regime === "BULL" || ch.regime === "EUPHORIA" ? "good"
            : ch.regime === "BEAR" || ch.regime === "CAPITULATION" ? "bad"
            : "neutral",
          text: `📊 Régime : ${REGIMES[ch.regime].name}`
        });
      } else if (ch.type === "eventEnd") {
        this.pushNotif({ type: "neutral", text: `📰 Fin de l'événement : ${ch.event.name}` });
      }
    }

    // 5) Progression update + achievements
    progression.update(market, portfolio, bots);
    const newly = progression.checkAchievements();
    for (const ach of newly) {
      portfolio.cash += ach.reward;
      this.pushNotif({ type: "achievement", text: `🏆 ${ach.name} (+${formatUSD(ach.reward)})` });
    }

    // 6) Auto-unlock new assets when value crosses threshold
    const currentValue = portfolio.totalValue(market.prices);
    for (const [sym, asset] of Object.entries(ASSETS)) {
      if (!progression.unlocked[sym] && currentValue >= asset.unlockCost) {
        progression.unlock(sym);
        this.pushNotif({ type: "good", text: `🔓 ${asset.name} (${asset.symbol}) débloqué !` });
      }
    }

    this.render();
  }

  // ============================================================
  // RENDERING
  // ============================================================

  render() {
    this.renderHeader();
    this.renderAssetList();
    this.renderChart();
    this.renderBots();
    this.renderAchievements();
  }

  renderHeader() {
    const { market, portfolio, progression } = this.state;
    const value = portfolio.totalValue(market.prices);
    const pnl = portfolio.realizedPnL + Object.entries(portfolio.holdings)
      .reduce((sum, [sym, h]) => sum + portfolio.unrealizedPnL(sym, market.prices[sym]), 0);

    this.el.portfolioValue.textContent = formatUSD(value);
    this.el.portfolioCash.textContent = `Cash: ${formatUSD(portfolio.cash)}`;

    const pnlPct = portfolio.totalDeposited > 0 ? pnl / portfolio.totalDeposited : 0;
    this.el.portfolioPnl.textContent = `${pnl >= 0 ? "▲" : "▼"} ${formatUSD(pnl)} (${formatPct(pnlPct)})`;
    this.el.portfolioPnl.className = "pnl " + (pnl >= 0 ? "positive" : "negative");

    // Tier
    const tier = getTier(progression.maxValue);
    const next = getNextTier(progression.maxValue);
    this.el.tierBadge.textContent = `${tier.name} • Tier ${tier.tier}`;
    if (next) {
      const span = next.minValue - tier.minValue;
      const filled = (progression.maxValue - tier.minValue) / span;
      this.el.tierProgressBar.style.width = `${Math.min(100, filled * 100)}%`;
      this.el.tierProgressLabel.textContent = `${formatUSD(progression.maxValue)} → ${formatUSD(next.minValue)} (${next.name})`;
    } else {
      this.el.tierProgressBar.style.width = "100%";
      this.el.tierProgressLabel.textContent = "Tier maximum atteint";
    }

    // Regime
    this.el.regimeBadge.textContent = REGIMES[market.regime].name;
    this.el.regimeBadge.className = "regime-badge regime-" + market.regime.toLowerCase();
  }

  renderAssetList() {
    const { market, portfolio, progression } = this.state;
    this.el.assetList.innerHTML = "";

    for (const [sym, asset] of Object.entries(ASSETS)) {
      const row = document.createElement("div");
      const unlocked = progression.unlocked[sym];
      row.className = "asset-row" + (sym === this.selectedAsset ? " selected" : "") + (unlocked ? "" : " locked");

      const change = market.getChange(sym, 30);
      const flash = market.flash[sym];
      const h = portfolio.holdings[sym];
      const holdingValue = h.units * market.prices[sym];

      if (unlocked) {
        row.innerHTML = `
          <div class="asset-icon">${asset.emoji}</div>
          <div class="asset-meta">
            <div class="asset-symbol">${asset.symbol}</div>
            <div class="asset-name">${asset.name}</div>
          </div>
          <div class="asset-numbers">
            <div class="asset-price ${flash || ''}">${formatPrice(market.prices[sym])}</div>
            <div class="asset-change ${change >= 0 ? 'positive' : 'negative'}">${formatPct(change)}</div>
          </div>
          ${h.units > 1e-9 ? `<div class="asset-holding">${formatUSD(holdingValue, { compact: true })}</div>` : ''}
        `;
        row.addEventListener("click", () => this.selectAsset(sym));
      } else {
        row.innerHTML = `
          <div class="asset-icon locked-icon">🔒</div>
          <div class="asset-meta">
            <div class="asset-symbol">${asset.symbol}</div>
            <div class="asset-name">Débloque à ${formatUSD(asset.unlockCost)}</div>
          </div>
        `;
      }
      this.el.assetList.appendChild(row);
    }
  }

  renderChart() {
    const { market, portfolio, progression } = this.state;
    const sym = this.selectedAsset;
    const asset = ASSETS[sym];

    if (!progression.unlocked[sym]) {
      this.selectedAsset = "BTC";
      return this.renderChart();
    }

    if (!this.chart) {
      this.chart = new PriceChart(this.el.chartCanvas);
    }

    const change = market.getChange(sym, 30);
    this.el.chartSymbol.textContent = `${asset.emoji} ${asset.name} • ${asset.symbol}`;
    this.el.chartPrice.textContent = formatPrice(market.prices[sym]);
    this.el.chartChange.textContent = formatPct(change);
    this.el.chartChange.className = "chart-change " + (change >= 0 ? "positive" : "negative");

    const h = portfolio.holdings[sym];
    if (h.units > 1e-9) {
      const upnl = portfolio.unrealizedPnL(sym, market.prices[sym]);
      this.el.chartHolding.innerHTML = `
        <span class="holding-units">${formatUnits(h.units, asset.symbol)}</span>
        <span class="holding-value">${formatUSD(h.units * market.prices[sym])}</span>
        <span class="holding-pnl ${upnl >= 0 ? 'positive' : 'negative'}">${formatUSD(upnl)}</span>
      `;
    } else {
      this.el.chartHolding.innerHTML = `<span class="holding-empty">Aucune position</span>`;
    }

    this.chart.draw(market.history[sym]);

    this.el.btnSell.disabled = !(h.units > 1e-9);
  }

  renderBots() {
    const { bots, progression } = this.state;
    const tier = getTier(progression.maxValue).tier;
    this.el.botList.innerHTML = "";

    for (const def of Object.values(BOT_TYPES)) {
      const bot = bots.getBot(def.id);
      const cost = bots.getCost(def.id);
      const unlocked = bots.isUnlockedFor(def.id, tier);
      const canAfford = this.state.portfolio.cash >= cost;

      const card = document.createElement("div");
      card.className = "bot-card" + (!unlocked ? " locked" : "") + (bot ? " owned" : "");

      const stateLine = bot
        ? `<div class="bot-stat">Niveau ${bot.level} • Total: ${formatUSD(bot.totalEarned)}</div>`
        : "";

      const button = unlocked
        ? `<button class="btn-bot-action" ${!canAfford ? "disabled" : ""}>
             ${bot ? "Améliorer" : "Acheter"} • ${formatUSD(cost)}
           </button>`
        : `<button class="btn-bot-action" disabled>
             Tier ${def.unlockTier} requis
           </button>`;

      card.innerHTML = `
        <div class="bot-icon">${def.icon}</div>
        <div class="bot-content">
          <div class="bot-name">${def.name}</div>
          <div class="bot-desc">${def.description}</div>
          ${stateLine}
        </div>
        <div class="bot-action">${button}</div>
      `;

      const btn = card.querySelector(".btn-bot-action");
      if (btn && unlocked && canAfford) {
        btn.addEventListener("click", () => this.purchaseBot(def.id));
      }
      this.el.botList.appendChild(card);
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
        <div class="ach-reward">+${formatUSD(ach.reward)}</div>
      `;
      this.el.achievementList.appendChild(card);
    }
  }

  // ============================================================
  // INTERACTIONS
  // ============================================================

  selectAsset(sym) {
    if (!this.state.progression.unlocked[sym]) return;
    this.selectedAsset = sym;
    this.render();
  }

  switchTab(name) {
    [this.el.btnTabMarket, this.el.btnTabBots, this.el.btnTabAchievements].forEach(b => b.classList.remove("active"));
    [this.el.panelMarket, this.el.panelBots, this.el.panelAchievements].forEach(p => p.classList.remove("active"));
    this.el[`btnTab${name.charAt(0).toUpperCase() + name.slice(1)}`].classList.add("active");
    this.el[`panel${name.charAt(0).toUpperCase() + name.slice(1)}`].classList.add("active");
  }

  openTradeModal(action) {
    const sym = this.selectedAsset;
    const asset = ASSETS[sym];
    const { portfolio, market } = this.state;
    const price = market.prices[sym];

    this.tradeAction = action;
    this.el.tradeModalTitle.textContent = action === "buy" ? `Acheter ${asset.symbol}` : `Vendre ${asset.symbol}`;
    this.el.tradeModalTitle.className = "modal-title trade-title-" + action;

    if (action === "buy") {
      const max = portfolio.cash;
      this.tradeMax = max;
      this.el.tradeModalSubtitle.textContent = `Cash disponible: ${formatUSD(max)}`;
      this.el.tradeModalAmount.value = Math.min(50, max).toFixed(2);
    } else {
      const h = portfolio.holdings[sym];
      const max = h.units * price;
      this.tradeMax = max;
      this.el.tradeModalSubtitle.textContent = `Position: ${formatUnits(h.units, sym)} (${formatUSD(max)})`;
      this.el.tradeModalAmount.value = max.toFixed(2);
    }

    this.el.tradeModalPresets.innerHTML = "";
    [0.10, 0.25, 0.50, 1.0].forEach(pct => {
      const btn = document.createElement("button");
      btn.className = "preset";
      btn.textContent = pct === 1.0 ? "MAX" : `${pct * 100}%`;
      btn.addEventListener("click", () => {
        this.el.tradeModalAmount.value = (this.tradeMax * pct).toFixed(2);
        this.syncSliderFromAmount();
        this.updateTradePreview();
      });
      this.el.tradeModalPresets.appendChild(btn);
    });

    this.syncSliderFromAmount();
    this.updateTradePreview();

    this.el.tradeModal.classList.add("visible");
  }

  syncSliderFromAmount() {
    const amount = parseFloat(this.el.tradeModalAmount.value) || 0;
    const pct = this.tradeMax > 0 ? Math.min(100, (amount / this.tradeMax) * 100) : 0;
    this.el.tradeModalSlider.value = pct;
  }

  updateTradePreview() {
    const pct = parseFloat(this.el.tradeModalSlider.value) || 0;
    const amount = (this.tradeMax * (pct / 100));
    if (document.activeElement !== this.el.tradeModalAmount) {
      this.el.tradeModalAmount.value = amount.toFixed(2);
    }
    const sym = this.selectedAsset;
    const price = this.state.market.prices[sym];
    const units = (parseFloat(this.el.tradeModalAmount.value) || 0) / price;
    this.el.tradeModalUnits.textContent = `≈ ${formatUnits(units, sym)} @ ${formatPrice(price)}`;
    this.el.tradeModalConfirm.disabled = !(parseFloat(this.el.tradeModalAmount.value) > 0);
  }

  confirmTrade() {
    const sym = this.selectedAsset;
    const amount = parseFloat(this.el.tradeModalAmount.value) || 0;
    if (amount <= 0) return;
    const price = this.state.market.prices[sym];

    let result;
    if (this.tradeAction === "buy") {
      result = this.state.portfolio.buy(sym, amount, price);
    } else {
      const units = amount / price;
      result = this.state.portfolio.sell(sym, Math.min(units, this.state.portfolio.holdings[sym].units), price);
    }

    if (result.ok) {
      this.state.progression.recordTrade({ market: this.state.market, type: this.tradeAction });
      const verb = this.tradeAction === "buy" ? "Achat" : "Vente";
      const pnlText = result.pnl !== undefined
        ? ` (${result.pnl >= 0 ? "+" : ""}${formatUSD(result.pnl)})`
        : "";
      this.pushNotif({
        type: this.tradeAction === "buy" ? "neutral" : (result.pnl >= 0 ? "good" : "bad"),
        text: `${verb} ${sym}: ${formatUSD(amount)}${pnlText}`
      });
      this.el.tradeModal.classList.remove("visible");
      this.persist();
      this.render();
    } else {
      this.pushNotif({ type: "bad", text: `Erreur: ${result.error}` });
    }
  }

  purchaseBot(id) {
    const result = this.state.bots.purchase(id, this.state.portfolio);
    if (result.ok) {
      const def = BOT_TYPES[id];
      this.pushNotif({ type: "good", text: `${def.icon} ${def.name} ${result.newLevel === 1 ? "acheté" : `niveau ${result.newLevel}`} !` });
      this.persist();
      this.render();
    }
  }

  confirmReset() {
    if (confirm("Tout réinitialiser ? Cette action est irréversible.")) {
      deleteSave();
      location.reload();
    }
  }

  // ============================================================
  // NOTIFICATIONS / EVENTS UI
  // ============================================================

  pushNotif(notif) {
    const el = document.createElement("div");
    el.className = `notif notif-${notif.type}`;
    el.textContent = notif.text;
    this.el.notifsContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    setTimeout(() => {
      el.classList.remove("visible");
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  showEventBanner(event) {
    const banner = this.el.eventBanner;
    banner.textContent = event.headline;
    banner.className = "event-banner visible " + (event.severity === "good" ? "good" : event.severity === "bad" || event.severity === "catastrophic" ? "bad" : "neutral");
    setTimeout(() => banner.classList.remove("visible"), 6000);
  }

  // ============================================================
  // PERSISTENCE / ONBOARDING
  // ============================================================

  persist() {
    saveGame(this.state);
  }

  maybeShowOnboarding() {
    if (!localStorage.getItem("cryptotycoon.seenOnboarding")) {
      document.getElementById("onboarding-modal").classList.add("visible");
      localStorage.setItem("cryptotycoon.seenOnboarding", "1");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
  // Expose for debug
  window.__app = app;
});
