/**
 * Crypto Trader Tycoon — Trading Bots
 * Bots automatisés débloqués progressivement.
 */

export const BOT_TYPES = {
  DCA: {
    id: "DCA",
    name: "DCA Bot",
    description: "Achète automatiquement un montant fixe à intervalles réguliers. Réduit le risque de timing.",
    baseCost: 500,
    upgradeCost: (level) => Math.floor(500 * Math.pow(2.2, level)),
    icon: "📊",
    unlockTier: 0,
    config: { symbol: "BTC", amountUsd: 5, intervalTicks: 30 }
  },
  MOMENTUM: {
    id: "MOMENTUM",
    name: "Momentum Bot",
    description: "Achète sur les tendances haussières fortes, prend ses profits sur l'envolée.",
    baseCost: 5000,
    upgradeCost: (level) => Math.floor(5000 * Math.pow(2.4, level)),
    icon: "🚀",
    unlockTier: 2,
    config: { symbol: "ETH", riskPct: 0.10 }
  },
  GRID: {
    id: "GRID",
    name: "Grid Bot",
    description: "Pose une grille d'achats/ventes autour d'un prix médian. Profite de la volatilité latérale.",
    baseCost: 25000,
    upgradeCost: (level) => Math.floor(25000 * Math.pow(2.6, level)),
    icon: "📐",
    unlockTier: 3,
    config: { symbol: "SOL", rangePct: 0.05 }
  },
  AI_ALPHA: {
    id: "AI_ALPHA",
    name: "AI Alpha Bot",
    description: "Détecte les régimes de marché et ajuste l'exposition. Génère de l'alpha sur tous les cycles.",
    baseCost: 100000,
    upgradeCost: (level) => Math.floor(100000 * Math.pow(2.8, level)),
    icon: "🧠",
    unlockTier: 5,
    config: {}
  },
  ARBITRAGE: {
    id: "ARBITRAGE",
    name: "Arbitrage Bot",
    description: "Capture micro-spreads inter-exchanges. Profit régulier indépendant du marché.",
    baseCost: 500000,
    upgradeCost: (level) => Math.floor(500000 * Math.pow(3.0, level)),
    icon: "⚡",
    unlockTier: 7,
    config: {}
  }
};

export class BotManager {
  constructor() {
    this.bots = {}; // id -> { id, level, cooldown, totalEarned }
  }

  hasBot(id) {
    return !!this.bots[id];
  }

  getBot(id) {
    return this.bots[id] || null;
  }

  isUnlockedFor(id, tier) {
    const def = BOT_TYPES[id];
    return def && tier >= def.unlockTier;
  }

  /**
   * Coût pour acheter ou upgrader un bot
   */
  getCost(id) {
    const def = BOT_TYPES[id];
    if (!def) return Infinity;
    const bot = this.bots[id];
    if (!bot) return def.baseCost;
    return def.upgradeCost(bot.level);
  }

  /**
   * Achète/upgrade un bot. Retourne { ok, error, newLevel }
   */
  purchase(id, portfolio) {
    const cost = this.getCost(id);
    if (portfolio.cash < cost) return { ok: false, error: "insufficient_cash" };

    portfolio.cash -= cost;
    if (!this.bots[id]) {
      this.bots[id] = { id, level: 1, cooldown: 0, totalEarned: 0 };
    } else {
      this.bots[id].level += 1;
    }
    return { ok: true, newLevel: this.bots[id].level, cost };
  }

  /**
   * Tick — exécute toutes les actions des bots
   */
  tick(market, portfolio) {
    const events = [];

    for (const [id, bot] of Object.entries(this.bots)) {
      const def = BOT_TYPES[id];
      if (!def) continue;

      switch (id) {
        case "DCA":
          this.tickDCA(bot, def, market, portfolio, events);
          break;
        case "MOMENTUM":
          this.tickMomentum(bot, def, market, portfolio, events);
          break;
        case "GRID":
          this.tickGrid(bot, def, market, portfolio, events);
          break;
        case "AI_ALPHA":
          this.tickAIAlpha(bot, def, market, portfolio, events);
          break;
        case "ARBITRAGE":
          this.tickArbitrage(bot, def, market, portfolio, events);
          break;
      }
    }
    return events;
  }

  tickDCA(bot, def, market, portfolio, events) {
    bot.cooldown -= 1;
    if (bot.cooldown > 0) return;
    // Frequency scales with level: faster at higher levels
    const interval = Math.max(8, 30 - bot.level * 2);
    bot.cooldown = interval;
    // Amount scales with level
    const amountUsd = 5 + bot.level * 2;
    if (portfolio.cash >= amountUsd) {
      const symbol = "BTC"; // DCA always BTC for simplicity
      const result = portfolio.buy(symbol, amountUsd, market.prices[symbol]);
      if (result.ok) {
        events.push({ botId: "DCA", action: "buy", symbol, amountUsd });
      }
    }
  }

  tickMomentum(bot, def, market, portfolio, events) {
    bot.cooldown -= 1;
    if (bot.cooldown > 0) return;
    bot.cooldown = 8;
    const symbol = "ETH";
    const change = market.getChange(symbol, 20);
    const h = portfolio.holdings[symbol];

    if (change > 0.04 && h.units < 0.0001) {
      // Strong uptrend, buy
      const usd = portfolio.cash * (0.05 + bot.level * 0.01);
      if (usd >= 5) {
        portfolio.buy(symbol, usd, market.prices[symbol]);
        events.push({ botId: "MOMENTUM", action: "buy", symbol, amountUsd: usd });
      }
    } else if (change < -0.03 && h.units > 0) {
      // Reversing, take profit / cut loss
      const result = portfolio.sell(symbol, "all", market.prices[symbol]);
      if (result.ok) {
        bot.totalEarned += result.pnl;
        events.push({ botId: "MOMENTUM", action: "sell", symbol, pnl: result.pnl });
      }
    }
  }

  tickGrid(bot, def, market, portfolio, events) {
    bot.cooldown -= 1;
    if (bot.cooldown > 0) return;
    bot.cooldown = 4;
    const symbol = "SOL";
    const price = market.prices[symbol];
    // Use historical median as anchor
    const hist = market.history[symbol];
    if (hist.length < 30) return;
    const recent = hist.slice(-30).map(x => x.price);
    const median = recent.slice().sort()[Math.floor(recent.length / 2)];
    const lower = median * (1 - 0.03);
    const upper = median * (1 + 0.03);
    const h = portfolio.holdings[symbol];

    if (price < lower && portfolio.cash > 50) {
      const usd = Math.min(portfolio.cash * 0.04, portfolio.cash * 0.01 * (1 + bot.level));
      if (usd >= 5) {
        portfolio.buy(symbol, usd, price);
        events.push({ botId: "GRID", action: "buy", symbol, amountUsd: usd });
      }
    } else if (price > upper && h.units > 0) {
      const portion = h.units * 0.3;
      const result = portfolio.sell(symbol, portion, price);
      if (result.ok) {
        bot.totalEarned += result.pnl;
        events.push({ botId: "GRID", action: "sell", symbol, pnl: result.pnl });
      }
    }
  }

  tickAIAlpha(bot, def, market, portfolio, events) {
    bot.cooldown -= 1;
    if (bot.cooldown > 0) return;
    bot.cooldown = 6;
    // Reads regime, picks best asset, sizes by edge
    const regime = market.regime;
    const targetSymbol = regime === "BULL" || regime === "EUPHORIA" ? "ETH"
      : regime === "BEAR" || regime === "CAPITULATION" ? "BTC"
      : "SOL";
    const price = market.prices[targetSymbol];
    const change = market.getChange(targetSymbol, 25);
    const value = portfolio.totalValue(market.prices);
    const targetExposure = (regime === "BULL" || regime === "EUPHORIA") ? 0.6 : 0.3;
    const currentExposure = (portfolio.holdings[targetSymbol].units * price) / value;

    if (currentExposure < targetExposure - 0.05 && portfolio.cash > 20) {
      const usd = Math.min(portfolio.cash * 0.08 * bot.level, portfolio.cash * 0.5);
      if (usd >= 10) {
        portfolio.buy(targetSymbol, usd, price);
        events.push({ botId: "AI_ALPHA", action: "buy", symbol: targetSymbol, amountUsd: usd });
      }
    } else if (currentExposure > targetExposure + 0.10 && portfolio.holdings[targetSymbol].units > 0) {
      const sellUnits = portfolio.holdings[targetSymbol].units * 0.3;
      const result = portfolio.sell(targetSymbol, sellUnits, price);
      if (result.ok) {
        bot.totalEarned += result.pnl;
        events.push({ botId: "AI_ALPHA", action: "sell", symbol: targetSymbol, pnl: result.pnl });
      }
    }
  }

  tickArbitrage(bot, def, market, portfolio, events) {
    // Arbitrage : profit fixe par tick proportionnel au cash
    const profit = portfolio.cash * 0.0008 * bot.level;
    if (profit > 0) {
      portfolio.cash += profit;
      bot.totalEarned += profit;
      portfolio.realizedPnL += profit;
    }
  }

  serialize() {
    return { bots: { ...this.bots } };
  }

  static deserialize(data) {
    const m = new BotManager();
    if (data && data.bots) m.bots = { ...data.bots };
    return m;
  }
}
